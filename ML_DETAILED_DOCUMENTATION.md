# DOCUMENTACIÓN DETALLADA DEL SISTEMA ML
## Shallow Neural Network para Recomendación de Salas

---

## 📋 ÍNDICE
1. [Arquitectura del Sistema](#arquitectura)
2. [FASE 1: Inferencia (Prediction Phase)](#fase-1-inferencia)
3. [FASE 2: Entrenamiento (Training Phase)](#fase-2-entrenamiento)
4. [Fórmulas Matemáticas](#fórmulas-matemáticas)
5. [Algoritmos Implementados](#algoritmos)

---

## 🏗️ ARQUITECTURA DEL SISTEMA {#arquitectura}

### Tipo de Red Neural
**Shallow Neural Network (Red Neural Superficial)**

```
INPUT LAYER (6 neurons)          AGGREGATION          OUTPUT
─────────────────────           ──────────           ──────
                                                     
Factor 1: Temperature    →                          
Factor 2: Availability   →                          
Factor 3: User History   →      Weighted Sum    →   Score (0-1)
Factor 4: Similar Users  →                          
Factor 5: Temporal       →                          
Factor 6: Capacity       →                          

Weights: [w1, w2, w3, w4, w5, w6]
```

### Pesos del Modelo (Weights)
```javascript
this.weights = {
  roomFeatures: 0.35,      // w1: Temperatura del usuario (35%)
  availability: 0.30,      // w2: Disponibilidad actual (30%)
  userHistory: 0.20,       // w3: Historial del usuario (20%)
  similarUsers: 0.08,      // w4: Usuarios similares (8%)
  temporalPattern: 0.05,   // w5: Patrones temporales (5%)
  capacityMatch: 0.02      // w6: Tamaño preferido (2%)
};                         
// TOTAL: Σwi = 1.00 (100%)
```

---

## 🔮 FASE 1: INFERENCIA (PREDICTION PHASE) {#fase-1-inferencia}

### **Objetivo:** Predecir la mejor sala para un usuario

### **Entrada del Sistema:**
```javascript
{
  userId: 5,                          // ID del usuario
  preferences: {
    preferredCapacity: "medium",       // Capacidad preferida
    preferredTimeSlot: "morning"       // NO se usa, solo historial
  }
}
```

### **Proceso de Inferencia:**

---

### **PASO 1: Obtención de Datos**

```javascript
// Código: roomRecommender.js líneas ~115-130
async getTopRecommendation(userId, preferences = {}) {
  // 1.1 Obtener todas las salas disponibles
  const rooms = await this.getRoomsData();
  
  // 1.2 Obtener datos del usuario
  const userData = await this.getUserData(userId);
  
  // 1.3 Calcular scores para todas las salas
  const scoredRooms = await this.calculateRoomScores(
    rooms, 
    userData, 
    preferences
  );
  
  // 1.4 Ordenar por score descendente
  scoredRooms.sort((a, b) => b.score - a.score);
  
  // 1.5 Retornar la mejor sala
  return scoredRooms[0];
}
```

**Datos obtenidos de la BD:**
- **Salas:** `id, code, name, temp, light, hum, capacity, currentOccupancy`
- **Usuario:** `id, nombre, preferenciaTemperatura, activeRoomCode`
- **Historial:** Visitas previas desde `RoomAccessHistory`

---

### **PASO 2: Cálculo de Scores por Factor**

#### **Fórmula General de la Red Neural:**

```
Score_total = Σ (wi × si)
            = w1×s1 + w2×s2 + w3×s3 + w4×s4 + w5×s5 + w6×s6

Donde:
  wi = peso del factor i (weight)
  si = score del factor i (0 ≤ si ≤ 1)
  Score_total ∈ [0, 1]
```

---

### **FACTOR 1: TEMPERATURA (35% - Máxima Prioridad)**

**Objetivo:** Medir qué tan bien la temperatura de la sala coincide con la preferencia del usuario.

#### **Código:**
```javascript
// Líneas ~220-240
calculateRoomFeaturesScore(room, userData, preferences) {
  if (!userData || !userData.preferenciaTemperatura) return 0.5;
  
  let score = 0;
  
  // Score principal: temperatura
  if (room.temp) {
    const tempScore = this.matchTemperaturePreference(
      room.temp, 
      userData.preferenciaTemperatura
    );
    score += tempScore * 0.7;  // 70% del peso es temperatura
  }
  
  // Score adicional: luz (15%)
  if (room.light) {
    score += this.normalizeLightLevel(room.light) * 0.15;
  }
  
  // Score adicional: humedad (15%)
  if (room.hum) {
    score += this.normalizeHumidityLevel(room.hum) * 0.15;
  }
  
  return Math.min(1.0, score);
}
```

#### **Fórmula Matemática:**

```
s_features = 0.7 × temp_score + 0.15 × light_score + 0.15 × humidity_score

temp_score = f(|T_room - T_ideal|)

Donde:
  T_ideal = { 18°C si pref=COLD
            { 22°C si pref=WARM  
            { 26°C si pref=HOT
            
  f(diff) = { 1.00  si diff = 0°C         (Perfecta)
            { 0.98  si diff ≤ 0.5°C       (Casi perfecta)
            { 0.95  si diff ≤ 1°C         (Excelente)
            { 0.85  si diff ≤ 3°C         (Muy confortable)
            { 0.70  si diff ≤ 4°C         (Confortable)
            { 0.50  si diff ≤ 5°C         (Aceptable)
            { 0.30  si diff ≤ 7°C         (Tolerable)
            { 0.15  si diff ≤ 9°C         (Poco confortable)
            { 0.05  en otro caso          (Muy incómodo)
```

**Ejemplo:**
```
Usuario con preferenciaTemperatura = "COLD" (ideal 18°C)
Sala con temperatura = 17.5°C

diff = |17.5 - 18| = 0.5°C
temp_score = f(0.5) = 0.98   (Casi perfecta)
s_features = 0.7 × 0.98 = 0.686

Contribución al score total:
w1 × s1 = 0.35 × 0.686 = 0.240 (24%)
```

---

### **FACTOR 2: DISPONIBILIDAD (30%)**

**Objetivo:** Priorizar salas con espacios disponibles.

#### **Código:**
```javascript
// Líneas ~260-280
calculateAvailabilityScore(room) {
  const capacity = room.capacity || 20;
  const occupancy = room.currentOccupancy || 0;
  
  // Calcular espacios disponibles
  const available = capacity - occupancy;
  const availabilityRate = available / capacity;
  
  // Sistema de scoring progresivo
  if (available === 0) return 0.0;           // Sala llena
  if (availabilityRate >= 0.7) return 1.0;   // 70%+ disponible
  if (availabilityRate >= 0.5) return 0.9;   // 50-70% disponible
  if (availabilityRate >= 0.3) return 0.7;   // 30-50% disponible
  if (availabilityRate >= 0.1) return 0.5;   // 10-30% disponible
  return 0.3;                                 // <10% disponible
}
```

#### **Fórmula Matemática:**

```
s_availability = g(available_rate)

available_rate = (capacity - current_occupancy) / capacity

g(r) = { 1.0  si r ≥ 0.7    (Muy disponible)
       { 0.9  si r ≥ 0.5    (Bastante disponible)
       { 0.7  si r ≥ 0.3    (Moderadamente disponible)
       { 0.5  si r ≥ 0.1    (Poca disponibilidad)
       { 0.3  si r > 0      (Muy llena)
       { 0.0  si r = 0      (Completamente llena)
```

**Ejemplo:**
```
Sala con capacity = 30, currentOccupancy = 8

available_rate = (30 - 8) / 30 = 22 / 30 = 0.733
s_availability = g(0.733) = 1.0   (Muy disponible)

Contribución al score total:
w2 × s2 = 0.30 × 1.0 = 0.30 (30%)
```

---

### **FACTOR 3: HISTORIAL DEL USUARIO (20%)**

**Objetivo:** Recomendar salas que el usuario ha visitado frecuentemente.

#### **Código:**
```javascript
// Líneas ~300-340
async calculateUserHistoryScore(room, userData) {
  if (!userData || !userData.id) return 0.5;
  
  try {
    const { RoomAccessHistory } = require('../models');
    
    // Contar visitas del usuario a ESTA sala
    const visitCount = await RoomAccessHistory.count({
      where: {
        userId: userData.id,
        roomId: room.id,
        action: 'ENTER'
      }
    });
    
    // Contar visitas TOTALES del usuario
    const totalVisits = await RoomAccessHistory.count({
      where: {
        userId: userData.id,
        action: 'ENTER'
      }
    });
    
    if (totalVisits === 0) return 0.5; // Usuario nuevo
    
    // Calcular porcentaje de visitas a esta sala
    const visitRate = visitCount / totalVisits;
    
    // Scoring progresivo
    if (visitCount >= 50) return 1.00;   // Usuario muy frecuente
    if (visitCount >= 25) return 0.90;   // Usuario frecuente
    if (visitCount >= 10) return 0.80;   // Usuario regular
    if (visitCount >= 5) return 0.70;    // Usuario ocasional
    if (visitCount >= 3) return 0.60;    // Ha visitado algunas veces
    if (visitCount >= 1) return 0.55;    // Ha visitado al menos una vez
    return 0.50;                         // Nunca ha visitado
    
  } catch (error) {
    return 0.5;
  }
}
```

#### **Fórmula Matemática:**

```
s_history = h(visit_count)

visit_rate = visits_to_this_room / total_visits_by_user

h(n) = { 1.00  si n ≥ 50    (Muy frecuente: >50 visitas)
       { 0.90  si n ≥ 25    (Frecuente: 25-49 visitas)
       { 0.80  si n ≥ 10    (Regular: 10-24 visitas)
       { 0.70  si n ≥ 5     (Ocasional: 5-9 visitas)
       { 0.60  si n ≥ 3     (Algunas veces: 3-4 visitas)
       { 0.55  si n ≥ 1     (Al menos una vez)
       { 0.50  si n = 0     (Nunca)
```

**Ejemplo:**
```
Usuario ha visitado Sala A: 15 veces
Usuario ha visitado total: 40 veces

visit_rate = 15 / 40 = 0.375 (37.5% de sus visitas)
s_history = h(15) = 0.80   (Usuario regular)

Contribución al score total:
w3 × s3 = 0.20 × 0.80 = 0.16 (16%)
```

---

### **FACTOR 4: USUARIOS SIMILARES (8%)**

**Objetivo:** **Filtrado Colaborativo** - Recomendar salas que visitan usuarios con preferencias similares.

#### **Código:**
```javascript
// Líneas ~400-470
async calculateSimilarUsersScore(room, userData) {
  if (!userData) return 0.5;
  
  try {
    const { RoomAccessHistory } = require('../models');
    
    // 1. Encontrar usuarios con la MISMA preferencia de temperatura
    const similarUsers = await Users.findAll({
      where: {
        preferenciaTemperatura: userData.preferenciaTemperatura,
        id: { [sequelize.Sequelize.Op.ne]: userData.id } // Excluir yo mismo
      },
      attributes: ['id'],
      limit: 50
    });
    
    if (similarUsers.length === 0) return 0.5;
    
    const similarUserIds = similarUsers.map(u => u.id);
    
    // 2. Contar visitas de usuarios similares a ESTA sala
    const visitsFromSimilarUsers = await RoomAccessHistory.count({
      where: {
        userId: { [sequelize.Sequelize.Op.in]: similarUserIds },
        roomId: room.id,
        action: 'ENTER'
      }
    });
    
    // 3. Calcular popularidad entre usuarios similares
    const visitRateBySimilarUsers = visitsFromSimilarUsers / similarUsers.length;
    
    // 4. Scoring progresivo
    if (visitRateBySimilarUsers >= 5) return 0.95;  // Muy popular (5+ visitas/usuario)
    if (visitRateBySimilarUsers >= 3) return 0.85;  // Popular (3-4 visitas/usuario)
    if (visitRateBySimilarUsers >= 2) return 0.75;  // Bastante visitada (2-3 visitas)
    if (visitRateBySimilarUsers >= 1) return 0.65;  // Moderada (1-2 visitas)
    if (visitRateBySimilarUsers >= 0.5) return 0.55; // Algo visitada (0.5-1)
    return visitsFromSimilarUsers > 0 ? 0.45 : 0.30;
    
  } catch (error) {
    return 0.5;
  }
}
```

#### **Fórmula Matemática (Filtrado Colaborativo):**

```
s_similar = k(visit_rate_similar)

visit_rate_similar = total_visits_by_similar_users / count_similar_users

Donde:
  similar_users = {u | u.tempPref = current_user.tempPref, u ≠ current_user}
  
k(r) = { 0.95  si r ≥ 5.0    (Muy popular entre similares)
       { 0.85  si r ≥ 3.0    (Popular)
       { 0.75  si r ≥ 2.0    (Bastante visitada)
       { 0.65  si r ≥ 1.0    (Moderadamente visitada)
       { 0.55  si r ≥ 0.5    (Algo visitada)
       { 0.45  si r > 0      (Pocas visitas)
       { 0.30  si r = 0      (No visitada)
```

**Ejemplo:**
```
Usuario con preferenciaTemperatura = "WARM"
Hay 20 usuarios similares con preferenciaTemperatura = "WARM"
Esos 20 usuarios han visitado Sala B: 45 veces en total

visit_rate_similar = 45 / 20 = 2.25 visitas por usuario similar
s_similar = k(2.25) = 0.75   (Bastante visitada)

Contribución al score total:
w4 × s4 = 0.08 × 0.75 = 0.06 (6%)
```

---

### **FACTOR 5: PATRONES TEMPORALES (5%)**

**Objetivo:** **Time Series Analysis** - Recomendar salas según el horario habitual del usuario.

#### **Código:**
```javascript
// Líneas ~580-750
async calculateTemporalScore(room, userData, preferences) {
  const now = new Date(Date.now());
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0=domingo, 6=sábado
  
  let score = 0.1; // Base score bajo
  let hasTimePattern = false;
  let currentTimeSlot = null;
  let visitsInTimeSlot = 0;
  
  if (userData && userData.id) {
    try {
      const { RoomAccessHistory } = require('../models');
      
      // Obtener últimas 50 visitas del usuario a ESTA sala
      const visits = await RoomAccessHistory.findAll({
        where: {
          userId: userData.id,
          roomId: room.id,
          action: 'ENTER'
        },
        attributes: ['createdAt', 'timestamp'],
        limit: 50
      });
      
      if (visits.length > 0) {
        // Analizar horas de visitas previas
        const visitHours = visits.map(v => {
          const date = v.timestamp || v.createdAt;
          return new Date(date).getHours();
        });
        
        // Función para determinar tramo del día
        const getCurrentTimeSlot = (hour) => {
          if (hour >= 6 && hour < 12) return 'morning';
          if (hour >= 12 && hour < 18) return 'afternoon';
          if (hour >= 18 && hour < 24) return 'evening';
          return 'night';
        };
        
        currentTimeSlot = getCurrentTimeSlot(currentHour);
        
        // Contar visitas en el MISMO TRAMO del día
        visitsInTimeSlot = visitHours.filter(h => {
          return getCurrentTimeSlot(h) === currentTimeSlot;
        }).length;
        
        // Contar visitas en ±1 hora (para scoring más preciso)
        const visitsInCurrentHour = visitHours.filter(h =>
          Math.abs(h - currentHour) <= 1
        ).length;
        
        // Calcular porcentajes
        const hourlyVisitRate = visitsInCurrentHour / visits.length;
        const visitRateInSlot = visitsInTimeSlot / visits.length;
        
        // DECISIÓN: ¿Hay patrón temporal?
        if (visitsInTimeSlot > 0 && visitRateInSlot >= 0.2) {
          hasTimePattern = true;  // Al menos 20% de visitas en este tramo
        }
        
        // SCORING basado en ±1 hora (más preciso)
        if (visitsInCurrentHour > 0) {
          if (hourlyVisitRate >= 0.8) score = 0.90;       // Patrón muy fuerte
          else if (hourlyVisitRate >= 0.6) score = 0.80;  // Patrón fuerte
          else if (hourlyVisitRate >= 0.4) score = 0.70;  // Patrón moderado
          else if (hourlyVisitRate >= 0.2) score = 0.60;  // Patrón débil
          else score = 0.40;                              // Pocas visitas
        } else if (visitsInTimeSlot > 0) {
          // Visitas en el tramo, pero no en ±1 hora
          if (visitRateInSlot >= 0.6) score = 0.70;
          else if (visitRateInSlot >= 0.4) score = 0.60;
          else if (visitRateInSlot >= 0.2) score = 0.50;
          else score = 0.40;
        } else {
          score = 0.2; // No hay visitas en este tramo
        }
        
        // Bonus por día de la semana (máximo +0.1)
        const visitDays = visits.map(v => {
          const date = v.timestamp || v.createdAt;
          return new Date(date).getDay();
        });
        const visitsOnThisDay = visitDays.filter(d => d === currentDay).length;
        if (visitsOnThisDay > 0) {
          const dayVisitRate = visitsOnThisDay / visits.length;
          if (dayVisitRate >= 0.3) {
            const dayBonus = Math.min(0.1, dayVisitRate * 0.15);
            score = Math.min(1.0, score + dayBonus);
          }
        }
        
        return {
          score: Math.min(1.0, score),
          hasTimePattern,
          timeSlot: currentTimeSlot,
          visitRateInSlot,
          visitsInTimeSlot
        };
      }
    } catch (error) {
      console.log('[ML] Error analyzing temporal history:', error.message);
    }
  }
  
  // Sin historial: bonus pequeño si es fin de semana
  if (currentDay === 0 || currentDay === 6) {
    score += 0.1;
  }
  
  return {
    score: Math.min(1.0, score),
    hasTimePattern: false,
    timeSlot: null,
    visitRateInSlot: 0,
    visitsInTimeSlot: 0
  };
}
```

#### **Fórmula Matemática:**

```
s_temporal = t(hourly_visit_rate) + day_bonus

hourly_visit_rate = visits_within_±1_hour / total_visits_to_room

t(r) = { 0.90  si r ≥ 0.8    (Patrón muy fuerte: 80%+ visitas a esta hora)
       { 0.80  si r ≥ 0.6    (Patrón fuerte: 60-79%)
       { 0.70  si r ≥ 0.4    (Patrón moderado: 40-59%)
       { 0.60  si r ≥ 0.2    (Patrón débil: 20-39%)
       { 0.40  si 0 < r < 0.2  (Pocas visitas a esta hora)
       { 0.20  si r = 0      (Sin visitas a esta hora)

day_bonus = { min(0.1, day_visit_rate × 0.15)  si day_visit_rate ≥ 0.3
            { 0                                 en otro caso

Donde:
  time_slot = { 'morning'   si 6 ≤ hour < 12
              { 'afternoon' si 12 ≤ hour < 18
              { 'evening'   si 18 ≤ hour < 24
              { 'night'     si 0 ≤ hour < 6
```

**Ejemplo:**
```
Usuario ha visitado Sala A 20 veces en total
Hora actual: 14:30 (afternoon)

Visitas entre 13:30-15:30 (±1 hora): 12 visitas
Visitas en tarde (12:00-17:59): 16 visitas
Visitas en lunes: 8 visitas
Día actual: Lunes

hourly_visit_rate = 12 / 20 = 0.60
s_temporal_base = t(0.60) = 0.80   (Patrón fuerte)

day_visit_rate = 8 / 20 = 0.40
day_bonus = min(0.1, 0.40 × 0.15) = min(0.1, 0.06) = 0.06

s_temporal = 0.80 + 0.06 = 0.86

Contribución al score total:
w5 × s5 = 0.05 × 0.86 = 0.043 (4.3%)
```

---

### **FACTOR 6: CAPACIDAD (2%)**

**Objetivo:** Recomendar salas del tamaño preferido (small/medium/large).

#### **Código:**
```javascript
// Líneas ~820-850
calculateCapacityScore(room, preferences) {
  const preferredCapacity = preferences.preferredCapacity;
  
  if (!preferredCapacity) return 0.5;
  
  const capacity = room.capacity;
  
  if (preferredCapacity === 'small') {
    if (capacity <= 15) return 1.0;   // Sala pequeña perfecta
    if (capacity <= 20) return 0.7;   // Casi pequeña
    if (capacity <= 30) return 0.4;   // Mediana
    return 0.2;                       // Grande
  }
  
  if (preferredCapacity === 'medium') {
    if (capacity > 15 && capacity <= 30) return 1.0;  // Sala mediana perfecta
    if (capacity <= 15 || capacity <= 40) return 0.7; // Cerca
    return 0.4;                                        // Lejos
  }
  
  if (preferredCapacity === 'large') {
    if (capacity > 30) return 1.0;    // Sala grande perfecta
    if (capacity > 20) return 0.7;    // Mediana-grande
    return 0.4;                       // Pequeña
  }
  
  return 0.5; // Sin preferencia
}
```

#### **Fórmula Matemática:**

```
s_capacity = c(capacity, preference)

c(cap, pref) = { 1.0  si cap ∈ range_ideal(pref)
               { 0.7  si cap ∈ range_acceptable(pref)
               { 0.4  si cap ∈ range_tolerable(pref)
               { 0.2  en otro caso

Donde:
  range_ideal = { [1, 15]     si pref = 'small'
                { [16, 30]    si pref = 'medium'
                { [31, 100]   si pref = 'large'
```

**Ejemplo:**
```
Usuario prefiere salas "medium"
Sala con capacity = 25

capacity ∈ [16, 30] = range_ideal('medium')
s_capacity = c(25, 'medium') = 1.0   (Sala mediana perfecta)

Contribución al score total:
w6 × s6 = 0.02 × 1.0 = 0.02 (2%)
```

---

### **PASO 3: Agregación - Weighted Sum**

#### **Fórmula Final:**

```
Score_total = Σ (wi × si)
            = w1×s1 + w2×s2 + w3×s3 + w4×s4 + w5×s5 + w6×s6
            
            = 0.35×s_temperature + 0.30×s_availability + 0.20×s_history 
              + 0.08×s_similar + 0.05×s_temporal + 0.02×s_capacity

Restricción:  0 ≤ Score_total ≤ 1
```

#### **Ejemplo Completo:**

```
DATOS:
- Usuario con preferenciaTemperatura = "COLD" (ideal 18°C)
- Sala A: temp=17.5°C, capacity=30, occupancy=8, visitas_usuario=15

CÁLCULOS:

Factor 1 (Temperatura):
  diff = |17.5 - 18| = 0.5°C
  s1 = 0.98
  Contribución: 0.35 × 0.98 = 0.343

Factor 2 (Disponibilidad):
  available_rate = (30-8)/30 = 0.733
  s2 = 1.0
  Contribución: 0.30 × 1.0 = 0.300

Factor 3 (Historial):
  visit_count = 15
  s3 = 0.80
  Contribución: 0.20 × 0.80 = 0.160

Factor 4 (Usuarios similares):
  visit_rate_similar = 2.5
  s4 = 0.75
  Contribución: 0.08 × 0.75 = 0.060

Factor 5 (Patrones temporales):
  hourly_visit_rate = 0.65
  s5 = 0.80
  Contribución: 0.05 × 0.80 = 0.040

Factor 6 (Capacidad):
  capacity = 30, pref = "medium"
  s6 = 1.0
  Contribución: 0.02 × 1.0 = 0.020

SCORE TOTAL:
Score_total = 0.343 + 0.300 + 0.160 + 0.060 + 0.040 + 0.020
            = 0.923  (92.3% de compatibilidad)
```

---

### **PASO 4: Generación de Razones (Explainability)**

El sistema genera explicaciones en lenguaje natural para justificar la recomendación:

```javascript
// Líneas ~150-280
const reasons = [];

if (availabilityScore > 0.7) {
  reasons.push(`High availability (${room.capacity - room.currentOccupancy} available spaces)`);
}

if (visitCount >= 50) {
  reasons.push(`Very frequent visitor (${visitCount} visits) - Your favorite room!`);
} else if (visitCount >= 25) {
  reasons.push(`Frequent visitor (${visitCount} visits) - You know this room well`);
}

if (similarUsersScore >= 0.75) {
  reasons.push('Similar users prefer this room');
}

if (featuresScore > 0.9 && room.temp) {
  reasons.push(`Perfect temperature (${room.temp}°C) for your preference ${userData.preferenciaTemperatura}`);
}

if (hasTimePattern && timeSlot && visitsInTimeSlot >= 3) {
  const timeSlotName = {
    'morning': 'in the morning',
    'afternoon': 'in the afternoon',
    'evening': 'in the evening'
  }[timeSlot];
  
  if (visitsInTimeSlot >= 50) {
    reasons.push(`Very frequent visitor ${timeSlotName} (${visitsInTimeSlot} visits)`);
  } else if (visitsInTimeSlot >= 25) {
    reasons.push(`Frequent visitor ${timeSlotName} (${visitsInTimeSlot} visits)`);
  }
}
```

---

### **SALIDA DEL SISTEMA:**

```json
{
  "success": true,
  "recommendation": {
    "roomId": 1,
    "roomName": "Sala A",
    "roomCode": "SALA-A-001",
    "score": 0.923,
    "reasons": [
      "High availability (22 available spaces)",
      "Regular visitor (15 visits) - You often use this room",
      "Similar users prefer this room",
      "Perfect temperature (17.5°C) for your preference COLD",
      "Frequent visitor in the afternoon (12 visits)"
    ],
    "features": {
      "temperature": 17.5,
      "light": 450,
      "humidity": 55,
      "capacity": 30,
      "currentOccupancy": 8,
      "occupancyRate": 0.267
    },
    "scoreBreakdown": {
      "features": 0.98,
      "availability": 1.0,
      "history": 0.80,
      "similarUsers": 0.75,
      "temporal": 0.80,
      "capacity": 1.0
    }
  }
}
```

---

## 🎓 FASE 2: ENTRENAMIENTO (TRAINING PHASE) {#fase-2-entrenamiento}

### **Objetivo:** Ajustar los pesos del modelo basándose en feedback real del usuario

### **Entrada del Sistema:**
```javascript
{
  userId: 5,
  roomId: 1,
  rating: 4,              // Calificación de 1 a 5
  actualUsage: 65,        // Tiempo real de uso en minutos
  satisfaction: "good"    // "poor", "neutral", "good"
}
```

---

### **PROCESO DE ENTRENAMIENTO:**

#### **PASO 1: Validación del Feedback**

```javascript
// Código: líneas ~950-980
async trainModel(feedback) {
  const { userId, roomId, rating, actualUsage, satisfaction } = feedback;
  
  // Validar datos
  if (!userId || !roomId || rating === undefined) {
    return { success: false, message: 'Invalid feedback' };
  }
  
  if (rating < 1 || rating > 5) {
    return { success: false, message: 'Rating must be between 1 and 5' };
  }
  
  console.log('[TRAINING] Feedback details:');
  console.log(`  - User ID: ${userId}`);
  console.log(`  - Room ID: ${roomId}`);
  console.log(`  - Rating: ${rating}/5`);
  console.log(`  - Actual usage: ${actualUsage} minutes`);
  console.log(`  - Satisfaction: ${satisfaction}`);
}
```

---

#### **PASO 2: Obtener Predicción Original**

```javascript
// Líneas ~1000-1030
const user = await this.getUserData(userId);
const room = await Rooms.findByPk(roomId);

const preferences = { preferredCapacity: 'medium' };
const originalScore = await this.calculateRoomScore(room, user, preferences);

console.log(`  - Predicted score: ${(originalScore.totalScore * 100).toFixed(2)}%`);
console.log('  - Score breakdown:');
console.log(`    · Temperature:   ${(originalScore.scoreBreakdown.features * 100).toFixed(1)}%`);
console.log(`    · Availability:  ${(originalScore.scoreBreakdown.availability * 100).toFixed(1)}%`);
console.log(`    · History:       ${(originalScore.scoreBreakdown.history * 100).toFixed(1)}%`);
console.log(`    · Similar users: ${(originalScore.scoreBreakdown.similarUsers * 100).toFixed(1)}%`);
console.log(`    · Temporal:      ${(originalScore.scoreBreakdown.temporal * 100).toFixed(1)}%`);
console.log(`    · Capacity:      ${(originalScore.scoreBreakdown.capacity * 100).toFixed(1)}%`);
```

---

#### **PASO 3: Calcular Target Score (Lo que debería haber predicho)**

```javascript
// Líneas ~1040-1080

// 3.1 Normalizar rating (1-5) a score (0-1)
const targetScore = rating / 5.0;

// 3.2 Ajuste por tiempo de uso real
let adjustedTarget = targetScore;
if (actualUsage !== undefined && actualUsage !== null) {
  if (actualUsage >= 60) {
    // Usuario se quedó más de 1 hora = buena recomendación
    adjustedTarget = Math.min(1.0, targetScore + 0.1);
  } else if (actualUsage <= 10) {
    // Usuario salió en <10 min = mala recomendación
    adjustedTarget = Math.max(0.0, targetScore - 0.1);
  }
}

// 3.3 Ajuste por satisfaction (muy importante)
if (satisfaction) {
  if (satisfaction === 'good') {
    // Usuario muy satisfecho
    adjustedTarget = Math.min(1.0, adjustedTarget + 0.15);
  } else if (satisfaction === 'poor') {
    // Usuario insatisfecho
    adjustedTarget = Math.max(0.0, adjustedTarget - 0.15);
  }
  // 'neutral' no ajusta
}

console.log('[TRAINING] Target calculation:');
console.log(`  - Base target (from rating): ${(targetScore * 100).toFixed(2)}%`);
console.log(`  - After usage adjustment: ${(adjustedTarget * 100).toFixed(2)}%`);
console.log(`  - Final adjusted target: ${(adjustedTarget * 100).toFixed(2)}%`);
```

#### **Fórmula Matemática:**

```
Target_base = rating / 5

Target_adjusted = Target_base + usage_adjustment + satisfaction_adjustment

usage_adjustment = { +0.1  si actualUsage ≥ 60 min
                   { -0.1  si actualUsage ≤ 10 min
                   {  0    en otro caso

satisfaction_adjustment = { +0.15  si satisfaction = 'good'
                          { -0.15  si satisfaction = 'poor'
                          {  0     si satisfaction = 'neutral'

Target_final = clamp(Target_adjusted, 0, 1)
```

**Ejemplo:**
```
rating = 4
actualUsage = 75 min
satisfaction = "good"

Target_base = 4 / 5 = 0.80
usage_adjustment = +0.1 (≥60 min)
satisfaction_adjustment = +0.15 (good)

Target_adjusted = 0.80 + 0.1 + 0.15 = 1.05
Target_final = min(1.05, 1.0) = 1.00
```

---

#### **PASO 4: Calcular Error de Predicción**

```javascript
// Líneas ~1090-1110
const error = adjustedTarget - originalScore.totalScore;
const errorPercentage = error * 100;

console.log(`  - Prediction error: ${errorPercentage > 0 ? '+' : ''}${errorPercentage.toFixed(2)}%`);

if (Math.abs(error) < 0.05) {
  console.log('  - Status: EXCELLENT (error < 5%) - No weight adjustment needed');
  return {
    success: true,
    message: 'Prediction was already accurate. No training needed.',
    weightsAdjusted: false
  };
}

console.log(`  - Status: ${Math.abs(error) < 0.15 ? 'GOOD' : 'NEEDS IMPROVEMENT'} - Adjusting weights...`);
```

#### **Fórmula Matemática:**

```
Error = Target - Prediction

Error% = Error × 100

Decision:
  |Error| < 0.05  → No ajustar pesos (predicción excelente)
  |Error| ≥ 0.05  → Aplicar Gradient Descent
```

**Ejemplo:**
```
Target = 1.00
Prediction = 0.85

Error = 1.00 - 0.85 = +0.15  (15% error positivo)
Status: NEEDS IMPROVEMENT → Ajustar pesos
```

---

#### **PASO 5: GRADIENT DESCENT - Ajuste de Pesos**

**Este es el CORAZÓN del algoritmo de entrenamiento.**

```javascript
// Líneas ~1120-1180

const learningRate = 0.05; // Tasa de aprendizaje (α)
const oldWeights = { ...this.weights };

// 1. Calcular gradientes para cada factor
const gradients = {
  roomFeatures: error * originalScore.scoreBreakdown.features * learningRate,
  availability: error * originalScore.scoreBreakdown.availability * learningRate,
  userHistory: error * originalScore.scoreBreakdown.history * learningRate,
  similarUsers: error * originalScore.scoreBreakdown.similarUsers * learningRate,
  temporalPattern: error * originalScore.scoreBreakdown.temporal * learningRate,
  capacityMatch: error * originalScore.scoreBreakdown.capacity * learningRate
};

// 2. Aplicar gradientes a los pesos
this.weights.roomFeatures += gradients.roomFeatures;
this.weights.availability += gradients.availability;
this.weights.userHistory += gradients.userHistory;
this.weights.similarUsers += gradients.similarUsers;
this.weights.temporalPattern += gradients.temporalPattern;
this.weights.capacityMatch += gradients.capacityMatch;

// 3. Normalizar pesos para que sumen 1.0
const totalWeight = Object.values(this.weights).reduce((a, b) => a + b, 0);
for (const key in this.weights) {
  this.weights[key] = this.weights[key] / totalWeight;
}

// 4. Aplicar constraints (límites)
this.weights.roomFeatures = Math.max(0.20, Math.min(0.50, this.weights.roomFeatures));
this.weights.availability = Math.max(0.15, Math.min(0.45, this.weights.availability));
this.weights.userHistory = Math.max(0.10, Math.min(0.35, this.weights.userHistory));
this.weights.similarUsers = Math.max(0.03, Math.min(0.20, this.weights.similarUsers));
this.weights.temporalPattern = Math.max(0.02, Math.min(0.15, this.weights.temporalPattern));
this.weights.capacityMatch = Math.max(0.01, Math.min(0.10, this.weights.capacityMatch));

// 5. Re-normalizar después de constraints
const totalWeightAfterConstraints = Object.values(this.weights).reduce((a, b) => a + b, 0);
for (const key in this.weights) {
  this.weights[key] = this.weights[key] / totalWeightAfterConstraints;
}

console.log('[TRAINING] Weight adjustments:');
console.log(`  - Temperature:   ${(oldWeights.roomFeatures * 100).toFixed(1)}% → ${(this.weights.roomFeatures * 100).toFixed(1)}%`);
console.log(`  - Availability:  ${(oldWeights.availability * 100).toFixed(1)}% → ${(this.weights.availability * 100).toFixed(1)}%`);
console.log(`  - History:       ${(oldWeights.userHistory * 100).toFixed(1)}% → ${(this.weights.userHistory * 100).toFixed(1)}%`);
console.log(`  - Similar users: ${(oldWeights.similarUsers * 100).toFixed(1)}% → ${(this.weights.similarUsers * 100).toFixed(1)}%`);
console.log(`  - Temporal:      ${(oldWeights.temporalPattern * 100).toFixed(1)}% → ${(this.weights.temporalPattern * 100).toFixed(1)}%`);
console.log(`  - Capacity:      ${(oldWeights.capacityMatch * 100).toFixed(1)}% → ${(this.weights.capacityMatch * 100).toFixed(1)}%`);
```

#### **Fórmula Matemática - Gradient Descent:**

```
ALGORITMO: Descenso de Gradiente (Gradient Descent)

1. CALCULAR GRADIENTE (derivada parcial del error respecto a cada peso):

   ∂Error/∂wi = Error × si

   Donde:
     Error = Target - Prediction
     si = score del factor i

2. ACTUALIZAR PESOS:

   wi_new = wi_old + α × (∂Error/∂wi)
          = wi_old + α × Error × si

   Donde:
     α = learning_rate = 0.05 (tasa de aprendizaje)

3. NORMALIZAR (para que Σwi = 1):

   wi_normalized = wi_new / Σ(wj_new)

4. APLICAR CONSTRAINTS (límites):

   wi_constrained = clamp(wi_normalized, wi_min, wi_max)

   Límites:
     w_temperature ∈ [0.20, 0.50]    (Siempre importante)
     w_availability ∈ [0.15, 0.45]   (Muy importante)
     w_history ∈ [0.10, 0.35]        (Importante)
     w_similar ∈ [0.03, 0.20]        (Moderadamente importante)
     w_temporal ∈ [0.02, 0.15]       (Menos importante)
     w_capacity ∈ [0.01, 0.10]       (Poco importante)

5. RE-NORMALIZAR después de constraints:

   wi_final = wi_constrained / Σ(wj_constrained)
```

---

#### **Ejemplo Numérico Completo:**

```
DATOS INICIALES:
- Pesos actuales: w = [0.35, 0.30, 0.20, 0.08, 0.05, 0.02]
- Scores de factores: s = [0.90, 0.85, 0.60, 0.70, 0.50, 0.80]
- Prediction original: 0.795
- Target ajustado: 1.00
- Error: +0.205  (el modelo SUBestimó)

PASO 1: Calcular gradientes
α = 0.05

∇w1 = α × Error × s1 = 0.05 × 0.205 × 0.90 = +0.00923
∇w2 = α × Error × s2 = 0.05 × 0.205 × 0.85 = +0.00871
∇w3 = α × Error × s3 = 0.05 × 0.205 × 0.60 = +0.00615
∇w4 = α × Error × s4 = 0.05 × 0.205 × 0.70 = +0.00718
∇w5 = α × Error × s5 = 0.05 × 0.205 × 0.50 = +0.00513
∇w6 = α × Error × s6 = 0.05 × 0.205 × 0.80 = +0.00820

PASO 2: Actualizar pesos
w1_new = 0.35 + 0.00923 = 0.35923
w2_new = 0.30 + 0.00871 = 0.30871
w3_new = 0.20 + 0.00615 = 0.20615
w4_new = 0.08 + 0.00718 = 0.08718
w5_new = 0.05 + 0.00513 = 0.05513
w6_new = 0.02 + 0.00820 = 0.02820

PASO 3: Normalizar
Σw_new = 1.0546

w1_norm = 0.35923 / 1.0546 = 0.3407
w2_norm = 0.30871 / 1.0546 = 0.2928
w3_norm = 0.20615 / 1.0546 = 0.1955
w4_norm = 0.08718 / 1.0546 = 0.0827
w5_norm = 0.05513 / 1.0546 = 0.0523
w6_norm = 0.02820 / 1.0546 = 0.0267

PASO 4: Aplicar constraints
w1_const = clamp(0.3407, 0.20, 0.50) = 0.3407  ✓
w2_const = clamp(0.2928, 0.15, 0.45) = 0.2928  ✓
w3_const = clamp(0.1955, 0.10, 0.35) = 0.1955  ✓
w4_const = clamp(0.0827, 0.03, 0.20) = 0.0827  ✓
w5_const = clamp(0.0523, 0.02, 0.15) = 0.0523  ✓
w6_const = clamp(0.0267, 0.01, 0.10) = 0.0267  ✓

PASO 5: Re-normalizar
Σw_const = 0.9907

w1_final = 0.3407 / 0.9907 = 0.344  (34.4%)
w2_final = 0.2928 / 0.9907 = 0.296  (29.6%)
w3_final = 0.1955 / 0.9907 = 0.197  (19.7%)
w4_final = 0.0827 / 0.9907 = 0.083  (8.3%)
w5_final = 0.0523 / 0.9907 = 0.053  (5.3%)
w6_final = 0.0267 / 0.9907 = 0.027  (2.7%)

RESULTADO:
Pesos ANTES: [35.0%, 30.0%, 20.0%, 8.0%, 5.0%, 2.0%]
Pesos DESPUÉS: [34.4%, 29.6%, 19.7%, 8.3%, 5.3%, 2.7%]

INTERPRETACIÓN:
- Temperatura: -0.6% (el usuario valora un poco menos la temperatura)
- Disponibilidad: -0.4% (el usuario valora un poco menos la disponibilidad)
- Historial: -0.3% (el usuario valora un poco menos su historial)
- Similares: +0.3% (el usuario valora MÁS lo que hacen usuarios similares)
- Temporal: +0.3% (el usuario valora MÁS los patrones de horario)
- Capacidad: +0.7% (el usuario valora MÁS el tamaño de la sala)

El modelo APRENDE que este usuario en particular se preocupa más por la capacidad
de la sala y menos por la temperatura de lo que el modelo pensaba inicialmente.
```

---

#### **PASO 6: Guardar Métricas de Entrenamiento**

```javascript
// Líneas ~1200-1250
const { TrainingMetrics } = require('../models');

// Guardar en base de datos para análisis
await TrainingMetrics.create({
  userId: userId,
  roomId: roomId,
  rating: rating,
  actualUsage: actualUsage,
  satisfaction: satisfaction,
  predictedScore: originalScore.totalScore,
  targetScore: adjustedTarget,
  error: error,
  weightTemperature: this.weights.roomFeatures,
  weightAvailability: this.weights.availability,
  weightHistory: this.weights.userHistory,
  weightSimilar: this.weights.similarUsers,
  weightTemporal: this.weights.temporalPattern,
  weightCapacity: this.weights.capacityMatch,
  scoreBreakdown: JSON.stringify(originalScore.scoreBreakdown)
});

console.log('[TRAINING] Training metrics saved to database');
console.log('[TRAINING] Model training completed successfully!\n');
```

---

### **SALIDA DEL ENTRENAMIENTO:**

```json
{
  "success": true,
  "message": "Model trained successfully with user feedback",
  "metrics": {
    "originalScore": 0.795,
    "targetScore": 1.00,
    "error": +0.205,
    "errorPercentage": +20.5,
    "weightsAdjusted": true,
    "weightsChanged": {
      "temperature": { "before": 35.0, "after": 34.4, "change": -0.6 },
      "availability": { "before": 30.0, "after": 29.6, "change": -0.4 },
      "history": { "before": 20.0, "after": 19.7, "change": -0.3 },
      "similarUsers": { "before": 8.0, "after": 8.3, "change": +0.3 },
      "temporal": { "before": 5.0, "after": 5.3, "change": +0.3 },
      "capacity": { "before": 2.0, "after": 2.7, "change": +0.7 }
    }
  },
  "recommendation": {
    "message": "The model has learned from your feedback and will make better recommendations in the future."
  }
}
```

---

## 📐 FÓRMULAS MATEMÁTICAS RESUMEN {#fórmulas-matemáticas}

### **Fórmula General de la Red Neural:**

```
Score = Σ(wi × si) = Σ(i=1 to 6) wi × si

Donde:
  wi = peso del factor i
  si = score del factor i
  Σwi = 1.0 (100%)
  0 ≤ si ≤ 1
  0 ≤ Score ≤ 1
```

### **Fórmulas por Factor:**

```
s1 = Temperature Score
   = 0.7 × f(|T_room - T_ideal|) + 0.15 × light + 0.15 × humidity

s2 = Availability Score
   = g((capacity - occupancy) / capacity)

s3 = History Score
   = h(visit_count_to_this_room)

s4 = Similar Users Score
   = k(visits_by_similar_users / count_similar_users)

s5 = Temporal Score
   = t(visits_in_current_hour / total_visits) + day_bonus

s6 = Capacity Score
   = c(capacity, preferred_size)
```

### **Gradient Descent:**

```
wi(t+1) = wi(t) + α × ∂L/∂wi

Donde:
  ∂L/∂wi = Error × si
  Error = Target - Prediction
  α = 0.05 (learning rate)
  t = iteración de entrenamiento
```

### **Normalización:**

```
wi_normalized = wi / Σ(wj)

Constraints:
  wi ∈ [wi_min, wi_max]
```

---

## 🧠 ALGORITMOS IMPLEMENTADOS {#algoritmos}

### **1. Collaborative Filtering (Filtrado Colaborativo)**
- **Dónde:** Factor 4 (Similar Users)
- **Concepto:** "Usuarios con preferencias similares visitan salas similares"
- **Implementación:** Encontrar usuarios con misma `preferenciaTemperatura` y contar sus visitas históricas

### **2. Content-Based Filtering (Filtrado Basado en Contenido)**
- **Dónde:** Factor 1 (Temperature), Factor 3 (History)
- **Concepto:** Recomendar salas con características similares a las que el usuario prefiere
- **Implementación:** Matching de temperatura del usuario con temperatura de salas

### **3. Time Series Analysis (Análisis de Series Temporales)**
- **Dónde:** Factor 5 (Temporal Patterns)
- **Concepto:** Detectar patrones de uso por hora del día y día de la semana
- **Implementación:** Análisis de distribución horaria de visitas previas

### **4. Gradient Descent (Descenso de Gradiente)**
- **Dónde:** Fase de Entrenamiento
- **Concepto:** Optimización iterativa de pesos para minimizar el error
- **Implementación:** Ajuste proporcional al error y al score de cada factor

### **5. Weighted Sum Aggregation (Agregación por Suma Ponderada)**
- **Dónde:** Cálculo del score total
- **Concepto:** Combinar múltiples factores con diferentes importancias
- **Implementación:** Σ(wi × si) con pesos configurables

---

## 📊 COMPLEJIDAD COMPUTACIONAL

### **Fase de Inferencia:**
```
O(nm) --> Order nm
Tiempo: O(n × m)
Donde:
  n = número de salas
  m = número de consultas a BD por sala

Operaciones por sala:
  - 1 consulta: historial del usuario (O(log k))
  - 1 consulta: usuarios similares (O(u))
  - 6 cálculos de scores (O(1))
  
Tiempo típico: 50-100ms para 10 salas
```

### **Fase de Entrenamiento:**
```
Tiempo: O(1)
Operaciones:
  - 1 predicción (reutiliza cálculo de inferencia)
  - 6 ajustes de pesos (O(1))
  - 1 escritura a BD (O(1))
  
Tiempo típico: 10-50ms
```

---

## 🎯 CARACTERÍSTICAS CLAVE

1. **Supervised Learning:** Aprende de feedback explícito (ratings)
2. **Online Learning:** Actualiza pesos después de cada feedback
3. **Explainable AI:** Genera razones en lenguaje natural
4. **Hybrid Approach:** Combina 4 técnicas de ML
5. **Shallow Network:** 1 capa (simple pero efectiva)
6. **Adaptive Weights:** Los pesos se ajustan según el usuario

---

**FIN DE LA DOCUMENTACIÓN**

Esta documentación cubre en detalle matemático y algorítmico ambas fases del sistema ML de recomendación de salas.

