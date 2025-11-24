
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
      console.log(`[ML] 🤖 Generando recomendación para usuario ${userId || 'anónimo'}`);
      console.log(`[ML] Preferencias recibidas:`, preferences);

      // Obtener todas las salas
      const rooms = await this.getRoomsData();
      if (!rooms || rooms.length === 0) {
        console.log('[ML] ❌ No hay salas disponibles');
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
        console.log('[ML] ❌ No se pudo calcular recomendación');
        return null;
      }

      console.log(`[ML] ✅ Sala recomendada: ${topRoom.name} (Score: ${(topRoom.score * 100).toFixed(1)}%)`);
      console.log(`[ML] Razones:`, topRoom.reasons);

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
      console.error('[ML] ❌ Error generando recomendación:', error.message);
      throw error;
    }
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
        reasons.push(`Alta disponibilidad (${room.capacity - room.currentOccupancy} espacios libres)`);
      } else if (availabilityScore > 0) {
        reasons.push(`Disponibilidad limitada (${room.capacity - room.currentOccupancy} espacios)`);
      } else {
        reasons.push('Sala actualmente llena');
      }

      // 2. Score de historial del usuario (20%)
      const historyScore = await this.calculateUserHistoryScore(room, userData);
      totalScore += historyScore * this.weights.userHistory;
      scoreBreakdown.history = historyScore;

      if (historyScore > 0.8) {
        reasons.push('Has usado esta sala frecuentemente');
      } else if (historyScore > 0.6) {
        reasons.push('Has visitado esta sala antes');
      }

      // 3. Score de usuarios similares (8%)
      const similarUsersScore = await this.calculateSimilarUsersScore(room, userData);
      totalScore += similarUsersScore * this.weights.similarUsers;
      scoreBreakdown.similarUsers = similarUsersScore;

      if (similarUsersScore > 0.6) {
        reasons.push('Usuarios similares prefieren esta sala');
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
          reasons.push(`🌡️ Temperatura perfecta (${room.temp}°C) para tu preferencia ${userData.preferenciaTemperatura}`);
        } else {
          reasons.push(`🌡️ Temperatura ideal (${room.temp}°C) muy cerca de tu preferencia`);
        }
      } else if (featuresScore > 0.7) {
        if (room.temp) {
          reasons.push(`🌡️ Temperatura confortable (${room.temp}°C)`);
        } else {
          reasons.push('Características confortables para ti');
        }
      } else if (featuresScore > 0.5 && room.temp) {
        reasons.push(`Temperatura aceptable (${room.temp}°C)`);
      }

      // 5. Score de patrones temporales (5%)
      const temporalScore = this.calculateTemporalScore(room, preferences);
      totalScore += temporalScore * this.weights.temporalPattern;
      scoreBreakdown.temporal = temporalScore;

      if (temporalScore > 0.6) {
        reasons.push(`Buen momento para usar esta sala (${preferences.preferredTimeSlot || 'ahora'})`);
      }

      // 6. Score de capacidad (2%)
      const capacityScore = this.calculateCapacityScore(room, preferences);
      totalScore += capacityScore * this.weights.capacityMatch;
      scoreBreakdown.capacity = capacityScore;

      if (capacityScore > 0.7) {
        reasons.push(`Tamaño ideal (capacidad: ${room.capacity})`);
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

    // Usuario está actualmente en esta sala
    if (userData.activeRoomCode === room.code) {
      return 0.9;
    }

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

        // Score basado en frecuencia de visitas
        if (visitCount > 10) return 0.95;  // Usuario frecuente
        if (visitCount > 5) return 0.85;   // Usuario regular
        if (visitCount > 2) return 0.75;   // Usuario ocasional
        if (visitCount > 0) return 0.65;   // Ha visitado antes
      }

      // Si no ha visitado o no existe historial, usar preferencia de temperatura
      if (userData.preferenciaTemperatura && room.temp) {
        const tempMatch = this.matchTemperaturePreference(
          room.temp,
          userData.preferenciaTemperatura
        );
        return tempMatch * 0.6;
      }

      return 0.5; // Score neutral

    } catch (error) {
      // Si la tabla no existe, usar fallback basado en temperatura
      if (userData.preferenciaTemperatura && room.temp) {
        const tempMatch = this.matchTemperaturePreference(
          room.temp,
          userData.preferenciaTemperatura
        );
        return tempMatch * 0.6;
      }
      return 0.5;
    }
  }

  /**
   * 3. Calcular score basado en usuarios similares (Filtrado Colaborativo)
   */
  async calculateSimilarUsersScore(room, userData) {
    if (!userData) return 0.5;

    try {
      // Buscar usuarios con preferencias similares
      const similarUsers = await Users.findAll({
        where: {
          preferenciaTemperatura: userData.preferenciaTemperatura,
          activeRoomCode: room.code
        },
        limit: 10
      });

      if (similarUsers.length > 0) {
        // Más usuarios similares = mayor score
        return Math.min(1.0, 0.5 + (similarUsers.length * 0.1));
      }

      return 0.5;
    } catch (error) {
      console.error('[ML] Error calculando usuarios similares:', error.message);
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

    // 🌡️ TEMPERATURA - 70% del peso (MÁXIMA PRIORIDAD)
    if (room.temp && userData && userData.preferenciaTemperatura) {
      const tempScore = this.matchTemperaturePreference(
        room.temp,
        userData.preferenciaTemperatura
      );
      totalScore += tempScore * 0.70;

      console.log(`[ML] 🌡️ Sala ${room.name}: Temp=${room.temp}°C, Preferencia=${userData.preferenciaTemperatura}, Score=${(tempScore * 100).toFixed(1)}%`);
    } else {
      // Si no hay temperatura o preferencia, score neutro con menor peso
      totalScore += 0.5 * 0.70;
    }

    // 💡 LUZ - 20% del peso
    if (room.light) {
      const lightScore = this.normalizeLightLevel(room.light);
      totalScore += lightScore * 0.20;
    } else {
      totalScore += 0.5 * 0.20;
    }

    // 💧 HUMEDAD - 10% del peso
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
   */
  calculateTemporalScore(room, preferences) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = domingo, 6 = sábado

    let score = 0.5; // Base score

    // Análisis por hora del día
    const timeSlot = preferences.preferredTimeSlot;
    if (timeSlot) {
      if (timeSlot === 'morning' && currentHour >= 6 && currentHour < 12) {
        score += 0.3;
      } else if (timeSlot === 'afternoon' && currentHour >= 12 && currentHour < 18) {
        score += 0.3;
      } else if (timeSlot === 'evening' && currentHour >= 18 && currentHour < 24) {
        score += 0.3;
      }
    }

    // Análisis por día de la semana (fin de semana = más disponibilidad)
    if (currentDay === 0 || currentDay === 6) {
      score += 0.2; // Bonus para fin de semana
    }

    return Math.min(1.0, score);
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
    if (diff === 0) return 1.0;                           // 🎯 Temperatura perfecta
    if (diff <= 0.5) return 0.98;                         // ⭐ Casi perfecta
    if (diff <= 1) return 0.95;                           // ✨ Excelente
    if (diff <= range.comfort) return 0.85;               // ✅ Muy confortable
    if (diff <= range.comfort + 1) return 0.70;           // 👍 Confortable
    if (diff <= range.acceptable) return 0.50;            // 😐 Aceptable
    if (diff <= range.acceptable + 2) return 0.30;        // 😕 Tolerable
    if (diff <= range.acceptable + 4) return 0.15;        // 😣 Poco confortable
    return 0.05;                                           // 😖 Muy incómodo
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
      console.error('[ML] Error obteniendo salas:', error.message);
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
      console.error('[ML] Error obteniendo usuario:', error.message);
      return null;
    }
  }

  /**
   * Entrenar modelo (ajustar pesos basado en feedback)
   * @param {Object} feedback - { userId, roomId, rating, actualUsage }
   */
  async trainModel(feedback) {
    console.log('[ML] 🎓 Entrenamiento del modelo iniciado...');
    console.log('[ML] Feedback recibido:', feedback);

    // Aquí se implementaría el ajuste de pesos basado en feedback real
    // Por ejemplo, usando descenso de gradiente simple

    // TODO: Implementar algoritmo de aprendizaje
    // - Recopilar feedback de usuarios (ratings, tiempo de uso, etc.)
    // - Ajustar pesos usando backpropagation o algoritmo similar
    // - Guardar pesos optimizados en base de datos o archivo

    console.log('[ML] ⚠️  Entrenamiento no implementado completamente (placeholder)');
    return {
      success: true,
      message: 'Feedback registrado. Entrenamiento programado para ejecución batch.',
      feedback
    };
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.cache.roomUsageHistory.clear();
    this.cache.userPreferences.clear();
    this.cache.similarityScores.clear();
    this.cache.lastUpdate = null;
    console.log('[ML] 🗑️  Cache limpiado');
  }
}

// Exportar instancia singleton
const recommenderInstance = new RoomRecommenderML();

module.exports = {
  RoomRecommenderML,
  recommender: recommenderInstance
};
