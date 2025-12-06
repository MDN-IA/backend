
/**
 * Módulo de Machine Learning para Recomendación de Salas
 *
 * Sistema híbrido que combina:
 * - Filtrado colaborativo (usuarios similares)
 * - Filtrado basado en contenido (características de salas)
 * - Reglas de negocio (disponibilidad, capacidad)
 * - Análisis temporal (patrones de uso por hora/día)
 *
 * PRIORIDADES:
 * 1. Temperatura del usuario (35%)
 * 2. Disponibilidad/Capacidad (30%)
 * 3. Historial del usuario (20%)
 * 4. Otros factores (15%)
 */

const { Rooms, Users, sequelize } = require('../models');

class RoomRecommenderML {
  constructor() {
    // Pesos del modelo optimizados según preferencias del usuario
    // PRIORIDAD 1: Temperatura (35%)
    // PRIORIDAD 2: Disponibilidad (30%)
    // PRIORIDAD 3: Historial (20%)
    // PRIORIDAD 4: Otros factores (15%)
    this.weights = {
      roomFeatures: 0.35,      // Temperatura del usuario (35%)
      availability: 0.30,      // Disponibilidad actual (30%)
      userHistory: 0.20,       // Historial del usuario (20%)
      similarUsers: 0.08,      // Usuarios similares (8%)
      temporalPattern: 0.05,   // Patrones temporales (5%)
      capacityMatch: 0.02      // Tamaño preferido (2%)
    };                         // TOTAL: 100%

    // Cache para mejorar rendimiento
    this.cache = {
      roomUsageHistory: new Map(),
      userPreferences: new Map(),
      similarityScores: new Map(),
      lastUpdate: null
    };

    // Configuración de cache (5 minutos)
    this.cacheExpiration = 5 * 60 * 1000;
  }

  /**
   * Obtener recomendación principal para un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} preferences - Preferencias del usuario
   * @returns {Object} Sala recomendada con score y razones
   */
  async getTopRecommendation(userId, preferences = {}) {
    try {
      console.log(`[ML] Generating recommendation for user ${userId || 'anonymous'}`);
      console.log(`[ML] Received preferences:`, preferences);

      // Obtener todas las salas
      const rooms = await this.getRoomsData();
      if (!rooms || rooms.length === 0) {
        console.log('[ML] No rooms available');
        return null;
      }

      // Obtener datos del usuario
      const userData = await this.getUserData(userId);

      // Calcular scores para todas las salas
      const scoredRooms = await this.calculateRoomScores(
        rooms,
        userData,
        preferences
      );

      // Ordenar por score y obtener la mejor
      scoredRooms.sort((a, b) => b.score - a.score);
      const topRoom = scoredRooms[0];

      if (!topRoom) {
        console.log('[ML] The recommendation has not been calculated');
        return null;
      }

      console.log(`[ML] Recommended room: ${topRoom.name} (Score: ${(topRoom.score * 100).toFixed(1)}%)`);
      console.log(`[ML] Reasons:`, topRoom.reasons);

      return {
        roomId: topRoom.id,
        roomName: topRoom.name,
        roomCode: topRoom.code,
        score: topRoom.score,
        reasons: topRoom.reasons,
        features: {
          temperature: topRoom.temp,
          light: topRoom.light,
          humidity: topRoom.hum,
          capacity: topRoom.capacity,
          currentOccupancy: topRoom.currentOccupancy,
          occupancyRate: topRoom.occupancyRate
        },
        scoreBreakdown: topRoom.scoreBreakdown
      };

    } catch (error) {
      console.error('[ML] Error generating the recommendation:', error.message);
      throw error;
    }
  }

  /**
   * Calcular score para UNA SOLA sala
   * Usado principalmente para entrenamiento del modelo
   * @param {Object} room - Sala individual
   * @param {Object} userData - Datos del usuario
   * @param {Object} preferences - Preferencias del usuario
   * @returns {Object} - { totalScore, scoreBreakdown, reasons }
   */
  async calculateRoomScore(room, userData, preferences) {
    let totalScore = 0;
    const reasons = [];
    const scoreBreakdown = {};

    // 1. Score de disponibilidad (30%)
    const availabilityScore = this.calculateAvailabilityScore(room);
    totalScore += availabilityScore * this.weights.availability;
    scoreBreakdown.availability = availabilityScore;

    if (availabilityScore > 0.7) {
      reasons.push(`High availability (${room.capacity - room.currentOccupancy} available spaces)`);
    } else if (availabilityScore > 0) {
      reasons.push(`Limited availability (${room.capacity - room.currentOccupancy} spaces left)`);
    } else {
      reasons.push('Room actually full');
    }

    // 2. Score de historial del usuario (20%)
    const historyScore = await this.calculateUserHistoryScore(room, userData);
    totalScore += historyScore * this.weights.userHistory;
    scoreBreakdown.history = historyScore;

    if (historyScore > 0.8) {
      reasons.push('You have used this room frequently');
    } else if (historyScore > 0.6) {
      reasons.push('You have visited this room before');
    }

    // 3. Score de usuarios similares (8%)
    const similarUsersScore = await this.calculateSimilarUsersScore(room, userData);
    totalScore += similarUsersScore * this.weights.similarUsers;
    scoreBreakdown.similarUsers = similarUsersScore;

    // Umbral aumentado a 0.75 para ser más selectivo (requiere 2+ visitas promedio)
    if (similarUsersScore >= 0.75) {
      reasons.push('Similar users prefer this room');
    }

    // 4. Score de características de la sala (35% - MÁXIMA PRIORIDAD)
    const featuresScore = this.calculateRoomFeaturesScore(room, userData, preferences);
    totalScore += featuresScore * this.weights.roomFeatures;
    scoreBreakdown.features = featuresScore;

    // Mensajes específicos según temperatura
    if (featuresScore > 0.9 && room.temperatura && userData && userData.preferenciaTemperatura) {
      const idealTemps = { 'COLD': 18, 'WARM': 22, 'HOT': 26 };
      const ideal = idealTemps[userData.preferenciaTemperatura] || 22;
      const diff = Math.abs(room.temperatura - ideal);
      if (diff <= 1) {
        reasons.push(`Perfect temperature (${room.temperatura}°C) for your preference ${userData.preferenciaTemperatura}`);
      } else {
        reasons.push(`Ideal temperature (${room.temperatura}°C) very close to your preference ${userData.preferenciaTemperatura}`);
      }
    } else if (featuresScore > 0.7) {
      if (room.temperatura) {
        reasons.push(`Comfortable temperature (${room.temperatura}°C)`);
      } else {
        reasons.push('Comfortable features for you');
      }
    } else if (featuresScore > 0.5 && room.temperatura) {
      reasons.push(`Acceptable temperature (${room.temperatura}°C)`);
    }

    // 5. Score de patrones temporales (5%)
    const temporalResult = await this.calculateTemporalScore(room, userData, preferences);
    const temporalScore = temporalResult.score || temporalResult; // Compatibilidad con ambos formatos
    const hasTimePattern = temporalResult.hasTimePattern || false;

    totalScore += temporalScore * this.weights.temporalPattern;
    scoreBreakdown.temporal = temporalScore;

    // Solo mostrar razón si hay un patrón REAL de visitas en este horario
    if (hasTimePattern && temporalScore > 0.7) {
      reasons.push(`You frequently visit this room at this time`);
    }
    // NO mostrar razones basadas solo en preferencias manuales o fin de semana

    // 6. Score de capacidad (2%)
    const capacityScore = this.calculateCapacityScore(room, preferences);
    totalScore += capacityScore * this.weights.capacityMatch;
    scoreBreakdown.capacity = capacityScore;

    if (capacityScore > 0.7) {
      reasons.push(`Ideal size (capacity: ${room.capacity})`);
    }

    // Normalizar score final entre 0 y 1
    totalScore = Math.max(0, Math.min(1, totalScore));

    return {
      totalScore,
      scoreBreakdown,
      reasons
    };
  }

  /**
   * Calcular scores para todas las salas
   */
  async calculateRoomScores(rooms, userData, preferences) {
    const scoredRooms = [];

    for (const room of rooms) {
      let totalScore = 0;
      const reasons = [];
      const scoreBreakdown = {};

      // 1. Score de disponibilidad (30%)
      const availabilityScore = this.calculateAvailabilityScore(room);
      totalScore += availabilityScore * this.weights.availability;
      scoreBreakdown.availability = availabilityScore;

      if (availabilityScore > 0.7) {
        reasons.push(`High availability (${room.capacity - room.currentOccupancy} available spaces)`);
      } else if (availabilityScore > 0) {
        reasons.push(`Limited availability (${room.capacity - room.currentOccupancy} spaces left)`);
      } else {
        reasons.push('Room actually full');
      }

      // 2. Score de historial del usuario (20%)
      const historyScore = await this.calculateUserHistoryScore(room, userData);
      totalScore += historyScore * this.weights.userHistory;
      scoreBreakdown.history = historyScore;

      // Las razones de historial SOLO aparecen con 3+ visitas confirmadas
      // 0.95 = 8+ visitas, 0.85 = 4+ visitas, 0.70 = 3+ visitas
      // Scores menores (2 visitas o menos) NO generan razones
      if (historyScore >= 0.85) {
        reasons.push('You have used this room frequently');
      } else if (historyScore >= 0.70) {
        reasons.push('You have visited this room before');
      }
      // Si historyScore < 0.70 (menos de 3 visitas), NO se agrega ninguna razón de historial

      // 3. Score de usuarios similares (8%)
      const similarUsersScore = await this.calculateSimilarUsersScore(room, userData);
      totalScore += similarUsersScore * this.weights.similarUsers;
      scoreBreakdown.similarUsers = similarUsersScore;

      // Umbral aumentado a 0.7 para ser más selectivo (requiere 2+ visitas promedio)
      if (similarUsersScore >= 0.75) {
        reasons.push('Similar users prefer this room');
      }

      // 4. Score de características de la sala (35% - MÁXIMA PRIORIDAD)
      const featuresScore = this.calculateRoomFeaturesScore(room, userData, preferences);
      totalScore += featuresScore * this.weights.roomFeatures;
      scoreBreakdown.features = featuresScore;

      // Mensajes específicos según temperatura
      if (featuresScore > 0.9 && room.temp && userData && userData.preferenciaTemperatura) {
        const idealTemps = { 'COLD': 18, 'WARM': 22, 'HOT': 26 };
        const ideal = idealTemps[userData.preferenciaTemperatura] || 22;
        const diff = Math.abs(room.temp - ideal);
        if (diff <= 1) {
          reasons.push(`Perfect temperature (${room.temp}°C) for your preference ${userData.preferenciaTemperatura}`);
        } else {
          reasons.push(`Ideal temperature (${room.temp}°C) very close to your preference ${userData.preferenciaTemperatura}`);
        }
      } else if (featuresScore > 0.7) {
        if (room.temp) {
          reasons.push(`Comfortable temperature (${room.temp}°C)`);
        } else {
          reasons.push('Comfortable features for you');
        }
      } else if (featuresScore > 0.5 && room.temp) {
        reasons.push(`Acceptable temperature (${room.temp}°C)`);
      }

      // 5. Score de patrones temporales (5%)
      const temporalResult = await this.calculateTemporalScore(room, userData, preferences);
      const temporalScore = temporalResult.score || temporalResult; // Compatibilidad con ambos formatos
      const hasTimePattern = temporalResult.hasTimePattern || false;

      totalScore += temporalScore * this.weights.temporalPattern;
      scoreBreakdown.temporal = temporalScore;

      // Solo mostrar razón si hay un patrón REAL de visitas en este horario
      if (hasTimePattern && temporalScore > 0.7) {
        reasons.push(`You frequently visit this room at this time`);
      }
      // NO mostrar razones basadas solo en preferencias manuales o fin de semana

      // 6. Score de capacidad (2%)
      const capacityScore = this.calculateCapacityScore(room, preferences);
      totalScore += capacityScore * this.weights.capacityMatch;
      scoreBreakdown.capacity = capacityScore;

      if (capacityScore > 0.7) {
        reasons.push(`Ideal size (capacity: ${room.capacity})`);
      }

      // Normalizar score final entre 0 y 1
      totalScore = Math.max(0, Math.min(1, totalScore));

      // Solo incluir salas con score > 0.2
      if (totalScore > 0.2) {
        scoredRooms.push({
          ...room,
          score: totalScore,
          reasons,
          scoreBreakdown
        });
      }
    }

    return scoredRooms;
  }

  /**
   * 1. Calcular score de disponibilidad
   */
  calculateAvailabilityScore(room) {
    if (room.currentOccupancy >= room.capacity) {
      return 0; // Penalización total si está llena
    }

    const occupancyRate = room.currentOccupancy / room.capacity;

    // Scoring no lineal: preferir salas con baja ocupación
    if (occupancyRate < 0.3) return 1.0;      // Muy disponible
    if (occupancyRate < 0.5) return 0.85;     // Alta disponibilidad
    if (occupancyRate < 0.7) return 0.6;      // Disponibilidad media
    if (occupancyRate < 0.9) return 0.3;      // Baja disponibilidad
    return 0.1;                                // Casi llena
  }

  /**
   * 2. Calcular score basado en historial del usuario
   */
  async calculateUserHistoryScore(room, userData) {
    if (!userData) return 0.5;

    try {
      // Intentar obtener historial real de la base de datos
      const { RoomAccessHistory } = require('../models');

      if (RoomAccessHistory) {
        // Contar visitas previas a esta sala
        const visitCount = await RoomAccessHistory.count({
          where: {
            userId: userData.id,
            roomId: room.id,
            action: 'ENTER'
          }
        });

        // Score basado ÚNICAMENTE en frecuencia de visitas reales
        // Las razones solo aparecen con 3+ visitas (score >= 0.70)
        if (visitCount >= 8) return 0.95;   // Usuario muy frecuente (>= 8 visitas)
        if (visitCount >= 4) return 0.85;   // Usuario frecuente (>= 4 visitas)
        if (visitCount >= 3) return 0.70;   // Ha visitado antes (>= 3 visitas) ⬅️ CAMBIO AQUÍ
        if (visitCount >= 1) return 0.55;   // Pocas visitas (1-2 visitas, sin razón)

        // Si visitCount === 0, NO usar temperatura, sino score base bajo
        // Esto es CRÍTICO para evitar que usuarios sin historial vean razones de visitas
        return 0.3; // Score bajo para usuario sin historial en esta sala
      }

      // Si la tabla no existe, usar score neutral (sin razones de historial)
      return 0.5;

    } catch (error) {
      // Si hay error, usar score neutral (sin razones de historial)
      return 0.5;
    }
  }

  /**
   * 3. Calcular score basado en usuarios similares (Filtrado Colaborativo)
   *
   * CONCEPTO: "Usuarios con preferencias similares visitan salas similares"
   *
   * Algoritmo:
   * 1. Encontrar usuarios con la misma preferencia de temperatura
   * 2. Ver cuántos de ellos han visitado HISTÓRICAMENTE esta sala
   * 3. Cuantas más visitas de usuarios similares = mayor score
   *
   * NO se basa en ocupación actual, sino en patrones históricos.
   */
  async calculateSimilarUsersScore(room, userData) {
    if (!userData) return 0.5;

    try {
      const { RoomAccessHistory } = require('../models');

      if (!RoomAccessHistory) {
        // Fallback: usar ocupación actual (menos preciso)
        return this.calculateCurrentOccupancyScore(room, userData);
      }

      // 1. Encontrar usuarios con preferencias similares (excepto el usuario actual)
      const similarUsers = await Users.findAll({
        where: {
          preferenciaTemperatura: userData.preferenciaTemperatura,
          id: { [sequelize.Sequelize.Op.ne]: userData.id } // Excluir al propio usuario
        },
        attributes: ['id'],
        limit: 50 // Muestra más amplia
      });

      if (similarUsers.length === 0) {
        return 0.5; // Sin usuarios similares = score neutral
      }

      const similarUserIds = similarUsers.map(u => u.id);

      // 2. Contar cuántos de estos usuarios han visitado ESTA sala
      const visitsFromSimilarUsers = await RoomAccessHistory.count({
        where: {
          userId: { [sequelize.Sequelize.Op.in]: similarUserIds },
          roomId: room.id,
          action: 'ENTER'
        }
      });

      // 3. Calcular score basado en popularidad entre usuarios similares
      // Normalizar por el número de usuarios similares encontrados
      const visitRateBySimiarUsers = visitsFromSimilarUsers / similarUsers.length;

      console.log(`[ML] Room ${room.name}: ${visitsFromSimilarUsers} visits from ${similarUsers.length} similar users (${(visitRateBySimiarUsers).toFixed(2)} avg)`);

      // Scoring progresivo
      if (visitRateBySimiarUsers >= 5) return 0.95;  // Muy popular entre similares (5+ visitas por usuario)
      if (visitRateBySimiarUsers >= 3) return 0.85;  // Popular (3-4 visitas por usuario)
      if (visitRateBySimiarUsers >= 2) return 0.75;  // Bastante visitada (2-3 visitas)
      if (visitRateBySimiarUsers >= 1) return 0.65;  // Moderadamente visitada (1-2 visitas)
      if (visitRateBySimiarUsers >= 0.5) return 0.55; // Algo visitada (0.5-1 visitas)

      // Si ningún usuario similar la ha visitado = score bajo
      return visitsFromSimilarUsers > 0 ? 0.45 : 0.3;

    } catch (error) {
      console.error('[ML] Error calculating similar users:', error.message);
      return 0.5;
    }
  }

  /**
   * Fallback: Score basado en ocupación actual (menos preciso)
   * Solo se usa si no hay historial disponible
   */
  calculateCurrentOccupancyScore(room, userData) {
    try {
      // Buscar usuarios similares que están AHORA en esta sala
      const similarUsersCount = Users.count({
        where: {
          preferenciaTemperatura: userData.preferenciaTemperatura,
          activeRoomCode: room.code,
          id: { [sequelize.Sequelize.Op.ne]: userData.id }
        }
      });

      // Score basado en cuántos están ahora
      if (similarUsersCount >= 3) return 0.75;
      if (similarUsersCount >= 2) return 0.65;
      if (similarUsersCount >= 1) return 0.55;
      return 0.5;

    } catch (error) {
      return 0.5;
    }
  }

  /**
   * 4. Calcular score basado en características de la sala
   * PRIORIDAD MÁXIMA: Temperatura del usuario (70% del peso)
   * Secundario: Luz (20%), Humedad (10%)
   */
  calculateRoomFeaturesScore(room, userData, preferences) {
    let totalScore = 0;

    // TEMPERATURA - 70% del peso (MÁXIMA PRIORIDAD)
    if (room.temp && userData && userData.preferenciaTemperatura) {
      const tempScore = this.matchTemperaturePreference(
        room.temp,
        userData.preferenciaTemperatura
      );
      totalScore += tempScore * 0.70;

      console.log(`[ML] Room ${room.name}: Temp=${room.temp}°C, Preference=${userData.preferenciaTemperatura}, Score=${(tempScore * 100).toFixed(1)}%`);
    } else {
      // Si no hay temperatura o preferencia, score neutro con menor peso
      totalScore += 0.5 * 0.70;
    }

    // LUZ - 20% del peso
    if (room.light) {
      const lightScore = this.normalizeLightLevel(room.light);
      totalScore += lightScore * 0.20;
    } else {
      totalScore += 0.5 * 0.20;
    }

    // HUMEDAD - 10% del peso
    if (room.hum) {
      const humScore = this.normalizeHumidityLevel(room.hum);
      totalScore += humScore * 0.10;
    } else {
      totalScore += 0.5 * 0.10;
    }

    return totalScore;
  }

  /**
   * 5. Calcular score basado en patrones temporales
   * Retorna: { score, hasTimePattern } para saber si hay patrón real de visitas en este horario
   */
  async calculateTemporalScore(room, userData, preferences) {
    const now = new Date(Date.now()); // Usar Date.now() para permitir mocking en tests
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = domingo, 6 = sábado

    let score = 0.1; // Base score más bajo para dar más peso al patrón histórico
    let hasTimePattern = false; // Indica si hay patrón real de visitas en este horario

    // =========================================================================
    // PARTE 1: Aprender del historial real del usuario (si existe)
    // =========================================================================
    if (userData && userData.id) {
      try {
        const { RoomAccessHistory } = require('../models');

        if (RoomAccessHistory) {
          // Obtener visitas previas a esta sala
          const visits = await RoomAccessHistory.findAll({
            where: {
              userId: userData.id,
              roomId: room.id,
              action: 'ENTER'
            },
            attributes: ['createdAt', 'timestamp'],
            limit: 50 // Últimas 50 visitas
          });

            if (visits.length > 0) {
            // Analizar en qué horas visita esta sala
            const visitHours = visits.map(v => {
              const date = v.timestamp || v.createdAt;
              return new Date(date).getHours();
            });
            const visitDays = visits.map(v => {
              const date = v.timestamp || v.createdAt;
              return new Date(date).getDay();
            });

            // Determinar el tramo del día actual
            // morning: 6-11, afternoon: 12-17, evening: 18-23, night: 0-5
            const getCurrentTimeSlot = (hour) => {
              if (hour >= 6 && hour < 12) return 'morning';
              if (hour >= 12 && hour < 18) return 'afternoon';
              if (hour >= 18 && hour < 24) return 'evening';
              return 'night';
            };

            const currentTimeSlot = getCurrentTimeSlot(currentHour);

            // Contar visitas en el MISMO TRAMO del día (no solo ±1 hora)
            const visitsInCurrentTimeSlot = visitHours.filter(h => {
              return getCurrentTimeSlot(h) === currentTimeSlot;
            }).length;

            // También contar visitas en ±1 hora para el score (más preciso)
            const visitsInCurrentHour = visitHours.filter(h =>
              Math.abs(h - currentHour) <= 1
            ).length;

            // Calcular el porcentaje de visitas A ESTA SALA en este horario
            const hourlyVisitRate = visitsInCurrentHour / visits.length;
            const timeSlotVisitRate = visitsInCurrentTimeSlot / visits.length;

            console.log(`[ML] Room ${room.name}: ${visitsInCurrentHour}/${visits.length} visits around ${currentHour}:00 (${(hourlyVisitRate * 100).toFixed(1)}%)`);
            console.log(`[ML] TimeSlot ${currentTimeSlot}: ${visitsInCurrentTimeSlot}/${visits.length} visits (${(timeSlotVisitRate * 100).toFixed(1)}%)`);

            if (visitsInCurrentHour > 0) {
              // HAY visitas en este horario
              // Pero solo marcar hasTimePattern si hay suficientes visitas en ESTE TRAMO del día
              // Umbral: al menos 20% de las visitas deben ser en este tramo para que cuente como patrón
              if (timeSlotVisitRate >= 0.2) {
                hasTimePattern = true;
                console.log(`[ML] ✓ Time pattern detected in ${currentTimeSlot} slot`);
              } else {
                hasTimePattern = false;
                console.log(`[ML] ✗ Not enough visits in ${currentTimeSlot} slot (${(timeSlotVisitRate * 100).toFixed(1)}%)`);
              }

              // Sistema de scoring progresivo basado en frecuencia DE ESTA SALA
              // Si el usuario visita ESTA sala y lo hace principalmente en este horario = ALTO score
              if (hourlyVisitRate >= 0.8) {
                // 80%+ de las visitas a ESTA sala son en este horario = patrón muy fuerte
                score = 0.90; // Bajado de 0.95 para dejar espacio al dayBonus
                console.log(`[ML] VERY STRONG temporal pattern: ${(hourlyVisitRate * 100).toFixed(0)}% of THIS room's visits at this time`);
              } else if (hourlyVisitRate >= 0.6) {
                // 60-79% = patrón fuerte
                score = 0.80; // Bajado de 0.85
                console.log(`[ML] Strong temporal pattern: ${(hourlyVisitRate * 100).toFixed(0)}% of THIS room's visits at this time`);
              } else if (hourlyVisitRate >= 0.4) {
                // 40-59% = patrón moderado
                score = 0.70; // Bajado de 0.75
                console.log(`[ML] Moderate temporal pattern: ${(hourlyVisitRate * 100).toFixed(0)}% of THIS room's visits at this time`);
              } else if (hourlyVisitRate >= 0.2) {
                // 20-39% = patrón débil
                score = 0.60; // Bajado de 0.65
                console.log(`[ML] Weak temporal pattern: ${(hourlyVisitRate * 100).toFixed(0)}% of THIS room's visits at this time`);
              } else {
                // <20% = pocas visitas en este horario
                score = 0.40; // Bajado de 0.45
                console.log(`[ML] Few visits at this time: ${(hourlyVisitRate * 100).toFixed(0)}%`);
              }
            } else {
              // No hay visitas a esta sala en este horario = NO hay patrón
              hasTimePattern = false;
              score = 0.2;
              console.log(`[ML] No visits to THIS room at this time (${currentHour}:00)`);
            }

            // Bonus adicional por día de la semana (máximo 0.1 para no superar 1.0)
            const visitsOnThisDay = visitDays.filter(d => d === currentDay).length;
            if (visitsOnThisDay > 0 && visits.length > 0) {
              const dayVisitRate = visitsOnThisDay / visits.length;
              if (dayVisitRate >= 0.3) {
                const dayBonus = Math.min(0.1, dayVisitRate * 0.15);
                score = Math.min(1.0, score + dayBonus); // Asegurar que no supere 1.0
                console.log(`[ML] Day pattern bonus: ${(dayBonus * 100).toFixed(1)}% (${(dayVisitRate * 100).toFixed(0)}% visits on this day)`);
              }
            }

            // Ya tenemos historial, devolver resultado
            return { score: Math.min(1.0, score), hasTimePattern };
          }
        }
      } catch (error) {
        // Si falla, continuar con el análisis manual
        console.log('[ML] Could not analyze temporal history, using preferences:', error.message);
      }
    }

    // =========================================================================
    // PARTE 2: Usar preferencias manuales del usuario (fallback o complemento)
    // Solo si NO hay historial - NO genera hasTimePattern
    // =========================================================================
    const timeSlot = preferences.preferredTimeSlot;
    if (timeSlot) {
      if (timeSlot === 'morning' && currentHour >= 6 && currentHour < 12) {
        score += 0.25;
      } else if (timeSlot === 'afternoon' && currentHour >= 12 && currentHour < 18) {
        score += 0.25;
      } else if (timeSlot === 'evening' && currentHour >= 18 && currentHour < 24) {
        score += 0.25;
      }
    }

    // =========================================================================
    // PARTE 3: Análisis general de disponibilidad por día
    // =========================================================================
    // Fin de semana = generalmente menos ocupado = mejor para encontrar espacio
    if (currentDay === 0 || currentDay === 6) {
      score += 0.1; // Bonus pequeño para fin de semana
    }

    // Devolver objeto - hasTimePattern sigue en false porque no hay patrón de visitas real
    return { score: Math.min(1.0, score), hasTimePattern: false };
  }

  /**
   * 6. Calcular score de capacidad
   */
  calculateCapacityScore(room, preferences) {
    const preferredCapacity = preferences.preferredCapacity;

    if (!preferredCapacity) return 0.5;

    const capacity = room.capacity;

    if (preferredCapacity === 'small') {
      if (capacity <= 15) return 1.0;
      if (capacity <= 20) return 0.7;
      if (capacity <= 30) return 0.4;
      return 0.2;
    }

    if (preferredCapacity === 'medium') {
      if (capacity > 15 && capacity <= 30) return 1.0;
      if (capacity <= 15 || capacity <= 40) return 0.7;
      return 0.4;
    }

    if (preferredCapacity === 'large') {
      if (capacity > 30) return 1.0;
      if (capacity > 20) return 0.7;
      return 0.4;
    }

    return 0.5;
  }

  /**
   * Utilidades: Match de preferencia de temperatura
   * Algoritmo mejorado con rangos de confort específicos por preferencia
   */
  matchTemperaturePreference(roomTemp, userPref) {
    if (!roomTemp || !userPref) return 0.5;

    // Rangos de temperatura ideales y de confort
    const temperatureRanges = {
      'COLD': {
        ideal: 18,      // Temperatura ideal para preferencia COLD
        comfort: 3,     // Rango de confort ±3°C
        acceptable: 5   // Rango aceptable ±5°C
      },
      'WARM': {
        ideal: 22,      // Temperatura ideal para preferencia WARM
        comfort: 2,     // Rango de confort ±2°C
        acceptable: 4   // Rango aceptable ±4°C
      },
      'HOT': {
        ideal: 26,      // Temperatura ideal para preferencia HOT
        comfort: 3,     // Rango de confort ±3°C
        acceptable: 5   // Rango aceptable ±5°C
      }
    };

    const range = temperatureRanges[userPref] || temperatureRanges['WARM'];
    const diff = Math.abs(roomTemp - range.ideal);

    // Sistema de scoring progresivo más estricto
    if (diff === 0) return 1.0;                           // Temperatura perfecta
    if (diff <= 0.5) return 0.98;                         // Casi perfecta
    if (diff <= 1) return 0.95;                           // Excelente
    if (diff <= range.comfort) return 0.85;               // Muy confortable
    if (diff <= range.comfort + 1) return 0.70;           // Confortable
    if (diff <= range.acceptable) return 0.50;            // Aceptable
    if (diff <= range.acceptable + 2) return 0.30;        // Tolerable
    if (diff <= range.acceptable + 4) return 0.15;        // Poco confortable
    return 0.05;                                          // Muy incómodo
  }

  /**
   * Utilidades: Normalizar nivel de luz
   */
  normalizeLightLevel(light) {
    if (!light) return 0.5;

    // Luz óptima entre 300-500 lux
    if (light >= 300 && light <= 500) return 1.0;
    if (light >= 200 && light <= 600) return 0.8;
    if (light >= 100 && light <= 700) return 0.6;
    return 0.4;
  }

  /**
   * Utilidades: Normalizar nivel de humedad
   */
  normalizeHumidityLevel(humidity) {
    if (!humidity) return 0.5;

    // Humedad óptima entre 40-60%
    if (humidity >= 40 && humidity <= 60) return 1.0;
    if (humidity >= 30 && humidity <= 70) return 0.8;
    if (humidity >= 20 && humidity <= 80) return 0.6;
    return 0.4;
  }

  /**
   * Obtener datos de salas
   */
  async getRoomsData() {
    try {
      const rooms = await Rooms.findAll({
        attributes: [
          'id', 'code', 'name', 'temp', 'light', 'hum',
          'capacity', 'currentOccupancy', 'tempHistory'
        ]
      });

      return rooms.map(room => {
        const data = room.toJSON();
        data.occupancyRate = data.capacity > 0
          ? data.currentOccupancy / data.capacity
          : 0;
        return data;
      });
    } catch (error) {
      console.error('[ML] Error retrieving rooms:', error.message);
      return [];
    }
  }

  /**
   * Obtener datos del usuario
   */
  async getUserData(userId) {
    if (!userId) return null;

    try {
      const user = await Users.findByPk(userId, {
        attributes: [
          'id', 'nombre', 'preferenciaTemperatura',
          'activeRoomCode', 'activeRoomId'
        ]
      });

      return user ? user.toJSON() : null;
    } catch (error) {
      console.error('[ML] Error retrieving user:', error.message);
      return null;
    }
  }

  /**
   * Entrenar modelo (ajustar pesos basado en feedback)
   *
   * ALGORITMO DE ENTRENAMIENTO:
   * 1. Recopilar feedback del usuario (rating 1-5, tiempo de uso real)
   * 2. Calcular el "error" entre lo predicho y la realidad
   * 3. Ajustar pesos usando Gradient Descent (descenso de gradiente)
   * 4. Guardar métricas de entrenamiento para análisis
   *
   * @param {Object} feedback - { userId, roomId, rating, actualUsage }
   * @returns {Object} - Resultado del entrenamiento con nuevos pesos
   */
  async trainModel(feedback) {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║         ML MODEL TRAINING - INITIATED                ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    const { userId, roomId, rating, actualUsage, satisfaction } = feedback;

    try {
      // ======================================================================
      // PASO 1: VALIDAR FEEDBACK
      // ======================================================================
      if (!userId || !roomId || rating === undefined) {
        return {
          success: false,
          message: 'Invalid feedback: userId, roomId, and rating are required',
          feedback
        };
      }

      if (rating < 1 || rating > 5) {
        return {
          success: false,
          message: 'Invalid rating: must be between 1 and 5',
          feedback
        };
      }

      console.log('[TRAINING] Feedback details:');
      console.log(`  - User ID: ${userId}`);
      console.log(`  - Room ID: ${roomId}`);
      console.log(`  - Rating: ${rating}/5 (${rating >= 4 ? 'POSITIVE' : rating >= 3 ? 'NEUTRAL' : 'NEGATIVE'})`);
      console.log(`  - Actual usage: ${actualUsage || 'N/A'} minutes`);
      console.log(`  - Satisfaction: ${satisfaction || 'N/A'}\n`);

      // ======================================================================
      // PASO 2: OBTENER DATOS DEL USUARIO Y LA SALA
      // ======================================================================
      const user = await this.getUserData(userId);
      const room = await Rooms.findByPk(roomId);

      if (!user || !room) {
        return {
          success: false,
          message: 'User or room not found',
          feedback
        };
      }

      console.log('[TRAINING] Context loaded:');
      console.log(`  - User: ${user.nombre} (Temp pref: ${user.preferenciaTemperatura})`);
      console.log(`  - Room: ${room.name} (Temp: ${room.temperatura}°C, Capacity: ${room.capacity})\n`);

      // ======================================================================
      // PASO 3: RECALCULAR SCORE CON PESOS ACTUALES (predicción original)
      // ======================================================================
      console.log('[TRAINING] Calculating original prediction with current weights...');
      const preferences = { preferredCapacity: 'medium', preferredTimeSlot: 'morning' };
      const originalScore = await this.calculateRoomScore(room, user, preferences);

      console.log(`  - Predicted score: ${(originalScore.totalScore * 100).toFixed(2)}%`);
      console.log('  - Score breakdown:');
      console.log(`    · Temperature:   ${(originalScore.scoreBreakdown.features * 100).toFixed(1)}% (weight: ${(this.weights.roomFeatures * 100).toFixed(0)}%)`);
      console.log(`    · Availability:  ${(originalScore.scoreBreakdown.availability * 100).toFixed(1)}% (weight: ${(this.weights.availability * 100).toFixed(0)}%)`);
      console.log(`    · History:       ${(originalScore.scoreBreakdown.history * 100).toFixed(1)}% (weight: ${(this.weights.userHistory * 100).toFixed(0)}%)`);
      console.log(`    · Similar users: ${(originalScore.scoreBreakdown.similarUsers * 100).toFixed(1)}% (weight: ${(this.weights.similarUsers * 100).toFixed(0)}%)`);
      console.log(`    · Temporal:      ${(originalScore.scoreBreakdown.temporal * 100).toFixed(1)}% (weight: ${(this.weights.temporalPattern * 100).toFixed(0)}%)`);
      console.log(`    · Capacity:      ${(originalScore.scoreBreakdown.capacity * 100).toFixed(1)}% (weight: ${(this.weights.capacityMatch * 100).toFixed(0)}%)\n`);

      // ======================================================================
      // PASO 4: CALCULAR "TARGET" (lo que debería haber predicho)
      // ======================================================================
      // Normalizar rating (1-5) a score (0-1)
      const targetScore = rating / 5.0;

      // Ajuste adicional por uso real (si la persona se quedó mucho tiempo = buena recomendación)
      let adjustedTarget = targetScore;
      if (actualUsage !== undefined && actualUsage !== null) {
        if (actualUsage >= 60) {
          adjustedTarget = Math.min(1.0, targetScore + 0.1); // Bonus si se quedó más de 1 hora
        } else if (actualUsage <= 10) {
          adjustedTarget = Math.max(0.0, targetScore - 0.1); // Penalización si salió rápido
        }
      }

      // Ajuste adicional por satisfaction (cómo se sintió el usuario)
      // Esto es CRÍTICO porque el usuario puede dar rating 3 pero sentirse muy mal (poor)
      // o dar rating 4 pero estar extático (good)
      if (satisfaction) {
        if (satisfaction === 'good') {
          adjustedTarget = Math.min(1.0, adjustedTarget + 0.15); // Aumentar target si muy satisfecho
        } else if (satisfaction === 'poor') {
          adjustedTarget = Math.max(0.0, adjustedTarget - 0.15); // Reducir target si insatisfecho
        }
        // 'neutral' no ajusta
      }

      console.log('[TRAINING] Target calculation:');
      console.log(`  - Base target (from rating): ${(targetScore * 100).toFixed(2)}%`);
      if (actualUsage !== undefined && actualUsage !== null) {
        console.log(`  - After usage adjustment: ${(adjustedTarget * 100).toFixed(2)}%`);
      }
      if (satisfaction) {
        console.log(`  - After satisfaction adjustment (${satisfaction}): ${(adjustedTarget * 100).toFixed(2)}%`);
      }
      console.log(`  - Final adjusted target: ${(adjustedTarget * 100).toFixed(2)}%`);

      // ======================================================================
      // PASO 5: CALCULAR ERROR
      // ======================================================================
      const error = adjustedTarget - originalScore.totalScore;
      const errorPercentage = error * 100;

      console.log(`  - Prediction error: ${errorPercentage > 0 ? '+' : ''}${errorPercentage.toFixed(2)}%`);

      if (Math.abs(error) < 0.05) {
        console.log('  - Status: EXCELLENT (error < 5%) - No weight adjustment needed\n');
        return {
          success: true,
          message: 'Prediction was already accurate. No training needed.',
          metrics: {
            originalScore: originalScore.totalScore,
            targetScore: adjustedTarget,
            error: error,
            weightsAdjusted: false
          }
        };
      }

      console.log(`  - Status: ${Math.abs(error) < 0.15 ? 'GOOD' : 'NEEDS IMPROVEMENT'} - Adjusting weights...\n`);

      // ======================================================================
      // PASO 6: AJUSTAR PESOS (Gradient Descent Simplificado)
      // ======================================================================
      console.log('[TRAINING] Applying gradient descent to adjust weights...');

      const learningRate = 0.05; // Tasa de aprendizaje conservadora
      const oldWeights = { ...this.weights };

      // Calcular gradientes para cada factor
      // Gradient = error × score_del_factor × learning_rate
      const gradients = {
        roomFeatures: error * originalScore.scoreBreakdown.features * learningRate,
        availability: error * originalScore.scoreBreakdown.availability * learningRate,
        userHistory: error * originalScore.scoreBreakdown.history * learningRate,
        similarUsers: error * originalScore.scoreBreakdown.similarUsers * learningRate,
        temporalPattern: error * originalScore.scoreBreakdown.temporal * learningRate,
        capacityMatch: error * originalScore.scoreBreakdown.capacity * learningRate
      };

      // Aplicar gradientes a los pesos
      this.weights.roomFeatures += gradients.roomFeatures;
      this.weights.availability += gradients.availability;
      this.weights.userHistory += gradients.userHistory;
      this.weights.similarUsers += gradients.similarUsers;
      this.weights.temporalPattern += gradients.temporalPattern;
      this.weights.capacityMatch += gradients.capacityMatch;

      // Asegurar que los pesos estén en [0, 1]
      Object.keys(this.weights).forEach(key => {
        this.weights[key] = Math.max(0.01, Math.min(0.99, this.weights[key]));
      });

      // Normalizar para que sumen 1.0
      const totalWeight = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
      Object.keys(this.weights).forEach(key => {
        this.weights[key] = this.weights[key] / totalWeight;
      });

      console.log('  - Learning rate: 0.05');
      console.log('  - Gradients calculated:');
      console.log(`    · Temperature:   ${(gradients.roomFeatures > 0 ? '+' : '')}${(gradients.roomFeatures * 100).toFixed(3)}%`);
      console.log(`    · Availability:  ${(gradients.availability > 0 ? '+' : '')}${(gradients.availability * 100).toFixed(3)}%`);
      console.log(`    · History:       ${(gradients.userHistory > 0 ? '+' : '')}${(gradients.userHistory * 100).toFixed(3)}%`);
      console.log(`    · Similar users: ${(gradients.similarUsers > 0 ? '+' : '')}${(gradients.similarUsers * 100).toFixed(3)}%`);
      console.log(`    · Temporal:      ${(gradients.temporalPattern > 0 ? '+' : '')}${(gradients.temporalPattern * 100).toFixed(3)}%`);
      console.log(`    · Capacity:      ${(gradients.capacityMatch > 0 ? '+' : '')}${(gradients.capacityMatch * 100).toFixed(3)}%\n`);

      // ======================================================================
      // PASO 7: VERIFICAR MEJORA
      // ======================================================================
      console.log('[TRAINING] Recalculating score with new weights...');
      const newScore = await this.calculateRoomScore(room, user, preferences);
      const newError = adjustedTarget - newScore.totalScore;

      console.log(`  - New predicted score: ${(newScore.totalScore * 100).toFixed(2)}%`);
      console.log(`  - New error: ${(newError > 0 ? '+' : '')}${(newError * 100).toFixed(2)}%`);
      console.log(`  - Improvement: ${(Math.abs(error) - Math.abs(newError) > 0 ? 'YES' : 'NO')} (${((Math.abs(error) - Math.abs(newError)) * 100).toFixed(2)}% better)\n`);

      // ======================================================================
      // PASO 8: MOSTRAR CAMBIOS EN PESOS
      // ======================================================================
      console.log('╔═════════════════════════════════════════════════════════════╗');
      console.log('║              WEIGHT ADJUSTMENTS SUMMARY                     ║');
      console.log('╠═════════════════════════════════════════════════════════════╣');
      console.log('│ Factor          │ Old Weight │ New Weight │ Change          │');
      console.log('├─────────────────┼────────────┼────────────┼─────────────────┤');

      Object.keys(this.weights).forEach(key => {
        const oldW = (oldWeights[key] * 100).toFixed(1);
        const newW = (this.weights[key] * 100).toFixed(1);
        const change = ((this.weights[key] - oldWeights[key]) * 100).toFixed(2);
        const changeStr = change > 0 ? `+${change}%` : `${change}%`;
        const keyLabel = key.padEnd(15);
        console.log(`│ ${keyLabel} │ ${oldW.padStart(9)}% │ ${newW.padStart(9)}% │ ${changeStr.padStart(13)}   │`);
      });

      console.log('└─────────────────┴────────────┴────────────┴─────────────────┘\n');

      // ======================================================================
      // PASO 9: GUARDAR MÉTRICAS (persistir en BD para análisis histórico)
      // ======================================================================
      const trainingMetrics = {
        userId,
        roomId,
        rating,
        actualUsage,
        satisfaction,
        originalScore: originalScore.totalScore,
        scoreBreakdown: originalScore.scoreBreakdown, // NUEVO: Desglose detallado
        targetScore: adjustedTarget,
        error: error,
        newScore: newScore.totalScore,
        newError: newError,
        improvement: Math.abs(error) - Math.abs(newError),
        weightsAdjusted: true,
        oldWeights,
        newWeights: { ...this.weights },
        learningRate: 0.05
      };

      // Guardar en tabla de métricas de entrenamiento
      try {
        const { TrainingMetrics } = require('../models');
        if (TrainingMetrics) {
          await TrainingMetrics.create(trainingMetrics);
          console.log('[TRAINING] Training metrics saved to database ✓');
        }
      } catch (dbError) {
        console.warn('[TRAINING] Could not save metrics to database:', dbError.message);
        // Continuar aunque falle el guardado
      }

      console.log('[TRAINING] Training completed successfully!');
      console.log(`[TRAINING] Model improved by ${((Math.abs(error) - Math.abs(newError)) * 100).toFixed(2)}%\n`);

      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║         ML MODEL TRAINING - COMPLETED              ║');
      console.log('╚════════════════════════════════════════════════════╝\n');

      return {
        success: true,
        message: 'Model trained successfully with user feedback',
        metrics: trainingMetrics
      };

    } catch (error) {
      console.error('[TRAINING] ERROR:', error.message);
      console.error(error.stack);

      return {
        success: false,
        message: `Training failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.cache.roomUsageHistory.clear();
    this.cache.userPreferences.clear();
    this.cache.similarityScores.clear();
    this.cache.lastUpdate = null;
    console.log('[ML] Cache cleaned');
  }
}

// Exportar instancia singleton
const recommenderInstance = new RoomRecommenderML();

module.exports = {
  RoomRecommenderML,
  recommender: recommenderInstance
};
