# 🎨 GUÍA VISUAL DEL ALGORITMO ML

## 🧠 El Cerebro del Sistema

```
          ┌─────────────────────────────────────┐
          │    SISTEMA DE RECOMENDACIÓN ML     │
          │                                     │
          │  "¿Qué sala es mejor para ti?"     │
          └──────────────┬──────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────────────┐
          │   ANALIZA 6 FACTORES                │
          └──────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐    ┌──────────┐    ┌──────────┐
    │  TU    │    │   TU     │    │  OTROS   │
    │ GUSTO  │    │HISTORIAL │    │ USUARIOS │
    └────────┘    └──────────┘    └──────────┘
         │               │               │
         └───────────────┴───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  SCORE FINAL     │
              │  0% ──────► 100% │
              └──────────────────┘
```

---

## 📊 Los 6 Factores Explicados Visualmente

### 1️⃣ TEMPERATURA (35%) - El Más Importante

```
TU PREFERENCIA: COLD (18°C)
═══════════════════════════════════════════════

SALA A: 18°C ────────────────────────► 100% ✅
        │                                    
        │ Diferencia: 0°C                   
        └─ PERFECTA                         

SALA B: 20°C ────────────────────► 85%
        │                              
        │ Diferencia: 2°C               
        └─ MUY BUENA                    

SALA C: 24°C ──────────► 55%
        │                  
        │ Diferencia: 6°C   
        └─ REGULAR          

SALA D: 28°C ───► 25%
        │          
        │ Diferencia: 10°C
        └─ MALA
```

**Por qué es el factor #1:**
```
🌡️  Temperatura incorrecta = Sala inutilizable
❌  No importa si está vacía o es tu favorita
❌  Si hace mucho calor/frío = NO la usarás
```

---

### 2️⃣ DISPONIBILIDAD (30%) - Espacios Libres

```
CAPACIDAD: 30 PERSONAS
═══════════════════════════════════════════════

Ocupación: 5/30 (16%) ────────────────► 100% ✅
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│●●●●●                        │
└─ MUY DISPONIBLE (25 espacios)

Ocupación: 15/30 (50%) ──────────► 85%
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│●●●●●●●●●●●●●●●              │
└─ DISPONIBILIDAD MEDIA

Ocupación: 25/30 (83%) ──► 30%
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│●●●●●●●●●●●●●●●●●●●●●●●●●    │
└─ CASI LLENA (solo 5 espacios)

Ocupación: 30/30 (100%) ► 0% ❌
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│●●●●●●●●●●●●●●●●●●●●●●●●●●●●●│
└─ LLENA (imposible entrar)
```

**Por qué es el factor #2:**
```
🚪  Sala llena = No puedes entrar
❌  Score perfecto en todo pero llena = Inútil
✅  Mejor una sala decente pero disponible
```

---

### 3️⃣ TU HISTORIAL (20%) - Lo Que Has Usado

```
TUS VISITAS (últimas 20):
═══════════════════════════════════════════════

SALA A: ████████████████ (16 visitas) ─► 90% ✅
        │
        └─ Claramente te funciona bien

SALA B: ████████ (8 visitas) ────────► 70%
        │
        └─ La has usado bastante

SALA C: ████ (4 visitas) ────────────► 55%
        │
        └─ La conoces pero no es tu favorita

SALA D: █ (1 visita) ─────────────────► 40%
        │
        └─ Casi no la usas

SALA E:  (0 visitas) ────────────────► 30%
        │
        └─ Nunca la has visitado
```

**Lógica:**
```
📚  Si siempre vas a Sala A → Probablemente te gusta
✅  Comportamiento pasado predice el futuro
🎯  80% de visitas a Sala A = Alta probabilidad de satisfacción
```

---

### 4️⃣ USUARIOS SIMILARES (8%) - Sabiduría de Masas

```
TU PREFERENCIA: COLD
═══════════════════════════════════════════════

Usuarios con misma preferencia (COLD):
┌────────┬────────┬────────┬────────┐
│  JUAN  │ MARÍA  │ PEDRO  │  ANA   │
│  COLD  │  COLD  │  COLD  │  COLD  │
└────────┴────────┴────────┴────────┘
    │        │        │        │
    │        │        │        │
    └────────┴────────┴────────┘
              │
              ▼
        SALA A (Popular)
        ████████████████████
        20 visitas totales
        
        → Score: 85% ✅
        → "Usuarios como tú prefieren esta sala"

VS

        SALA B (Poco usada)
        ████
        4 visitas totales
        
        → Score: 45%
        → "Usuarios como tú no la eligen mucho"
```

**Ventaja:**
```
🆕  Útil para USUARIOS NUEVOS sin historial
👥  "Si otros como yo van ahí, probablemente me guste"
🎯  Soluciona el "Cold Start Problem"
```

---

### 5️⃣ PATRONES TEMPORALES (5%) - Tus Horarios

```
TUS VISITAS A SALA A:
═══════════════════════════════════════════════

HORA DEL DÍA:
00:00 ─────────────────────────────────► 24:00
│                                           │
│                                           │
│        ████████████                       │
│        09:00 - 11:00                      │
│        (10 visitas)                       │
│                                           │
│                                ████       │
│                                15:00      │
│                                (2 visitas)│
└───────────────────────────────────────────┘

PREDICCIÓN:
├─ A las 09:00 AM ──────────────────► 95% ✅
│  "Siempre vienes a esta hora"
│
├─ A las 15:00 PM ──────────────────► 65%
│  "A veces vienes a esta hora"
│
└─ A las 22:00 PM ──────────────────► 20% ❌
   "Nunca has venido a esta hora"
```

**Ejemplo Real:**
```
👨‍🎓 Estudiante: Siempre usa salas 9-12h (mañanas)
   → A las 10 AM: Bonus +5%
   → A las 10 PM: Neutral

👨‍💼 Trabajador: Siempre usa salas 14-18h (tardes)
   → A las 15h: Bonus +5%
   → A las 9 AM: Neutral
```

---

### 6️⃣ TAMAÑO DE SALA (2%) - Menos Importante

```
TU PREFERENCIA: MEDIUM (16-30 personas)
═══════════════════════════════════════════════

SALA A: 25 personas ────────────────► 100% ✅
        │
        └─ Dentro del rango preferido

SALA B: 35 personas ────────────────► 30%
        │
        └─ Muy grande (fuera del rango)

SALA C: 10 personas ────────────────► 30%
        │
        └─ Muy pequeña (fuera del rango)
```

**Por qué tan poco peso (2%):**
```
🤷  No es crítico para la experiencia
✅  Si hay espacio, el tamaño no importa mucho
📊  Datos reales muestran que no afecta satisfacción
```

---

## 🎯 SUMA PONDERADA: Cómo Se Calcula El Score Final

### Ejemplo Completo

```
USUARIO: Juan (COLD, 50 visitas históricas)
SALA: Sala A
HORA: 09:00 AM
═══════════════════════════════════════════════

PASO 1: Calcular cada factor
────────────────────────────────────────────────

┌─────────────────┬────────┬────────┬────────────┐
│ FACTOR          │ SCORE  │ PESO   │ APORTE     │
├─────────────────┼────────┼────────┼────────────┤
│ Temperatura     │  1.00  │  35%   │  0.3500    │
│ (18°C perfect)  │        │        │            │
├─────────────────┼────────┼────────┼────────────┤
│ Disponibilidad  │  1.00  │  30%   │  0.3000    │
│ (8/30 ocupados) │        │        │            │
├─────────────────┼────────┼────────┼────────────┤
│ Tu Historial    │  0.85  │  20%   │  0.1700    │
│ (35/50 visitas) │        │        │            │
├─────────────────┼────────┼────────┼────────────┤
│ Usuarios Similar│  0.85  │   8%   │  0.0680    │
│ (20 usuarios)   │        │        │            │
├─────────────────┼────────┼────────┼────────────┤
│ Patrón Temporal │  0.95  │   5%   │  0.0475    │
│ (30/35 a 9AM)   │        │        │            │
├─────────────────┼────────┼────────┼────────────┤
│ Tamaño Sala     │  1.00  │   2%   │  0.0200    │
│ (30 personas)   │        │        │            │
└─────────────────┴────────┴────────┴────────────┘

PASO 2: Sumar aportes
────────────────────────────────────────────────

Total = 0.35 + 0.30 + 0.17 + 0.068 + 0.0475 + 0.02
Total = 0.9555

PASO 3: Resultado
────────────────────────────────────────────────

┌────────────────────────────────────────────────┐
│                                                │
│   COMPATIBILIDAD: 95.55% ⭐⭐⭐⭐⭐            │
│                                                │
│   RAZONES:                                     │
│   ✓ Perfect temperature for you (18°C)        │
│   ✓ You frequently visit this room at 9 AM    │
│   ✓ You have used this room frequently        │
│   ✓ High availability (22 spaces left)        │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 🔄 ENTRENAMIENTO: Cómo Aprende El Modelo

### Flujo Visual del Aprendizaje

```
PASO 1: RECOMENDACIÓN
═══════════════════════════════════════════════
Sistema predice: Sala A es 85% compatible
                                │
                                ▼
                    ┌───────────────────┐
                    │   USUARIO USA     │
                    │     SALA A        │
                    └───────────────────┘
                                │
                                ▼
PASO 2: FEEDBACK REAL
═══════════════════════════════════════════════
Usuario califica: ⭐⭐⭐⭐⭐ (5/5)
Tiempo de uso: 90 minutos
                                │
                                ▼
PASO 3: COMPARACIÓN
═══════════════════════════════════════════════
Predicción: 85% ────┐
                    ├─► ERROR: +15%
Realidad:   100% ───┘    (Subestimó)
                                │
                                ▼
PASO 4: AJUSTE DE PESOS
═══════════════════════════════════════════════

ANTES:                     DESPUÉS:
Temperature:  35%  ─────►  37%  (+2%) ⬆
Availability: 30%  ─────►  29%  (-1%)
History:      20%  ─────►  22%  (+2%) ⬆
Similar:       8%  ─────►   7%  (-1%)
Temporal:      5%  ─────►   4%  (-1%)
Capacity:      2%  ─────►   1%  (-1%)
                                │
                                ▼
PASO 5: NUEVA PREDICCIÓN
═══════════════════════════════════════════════
Nueva predicción: 92% (más cercano a 100%)
Mejora: 7% ✅
                                │
                                ▼
        ┌───────────────────────────────┐
        │  MODELO APRENDIÓ ✅            │
        │                                │
        │  Ahora confía más en:          │
        │  • Tu historial (+2%)          │
        │  • Temperatura (+2%)           │
        │                                │
        │  Y menos en:                   │
        │  • Tamaño de sala (-1%)        │
        └────────────────────────────────┘
```

### Gradient Descent Visualizado

```
ANALOGÍA: Bajar una montaña en la niebla
═══════════════════════════════════════════════

        ^                    INICIO
   ERROR│        ╱╲            ●
        │       ╱  ╲          ╱│
        │      ╱    ╲        ╱ │ Paso 1: -5%
        │     ╱      ╲      ╱  │
        │    ╱        ╲    ●   │ Paso 2: -3%
        │   ╱          ╲  ╱│   │
        │  ╱      🎯    ╲╱ │   │ Paso 3: -2%
        │ ╱     MÍNIMO   ● │   │
        │╱       ERROR    │ │   │ Paso 4: -1%
        │                 ●─┘   │ Paso 5: -0.5%
        │                  ●────┘ CONVERGENCIA ✓
        └─────────────────────────────────────►
                    PESOS

Cada "paso" es un entrenamiento con feedback.
El algoritmo baja gradualmente hacia el mínimo error.
```

### Fórmula Simplificada

```
╔═══════════════════════════════════════════════╗
║                                               ║
║   nuevo_peso = peso_viejo + ajuste            ║
║                                               ║
║   donde:                                      ║
║   ajuste = error × score_factor × 0.05        ║
║                                               ║
║   Ejemplo:                                    ║
║   error = +0.15 (subestimamos)                ║
║   score_temp = 0.85                           ║
║   ajuste = 0.15 × 0.85 × 0.05 = +0.0064      ║
║                                               ║
║   peso_temp_nuevo = 0.35 + 0.0064 = 0.3564   ║
║                                               ║
╚═══════════════════════════════════════════════╝
```

---

## 📈 EVOLUCIÓN DEL MODELO

### Aprendizaje Iterativo

```
ENTRENAMIENTO #1: Rating 5 ⭐⭐⭐⭐⭐
─────────────────────────────────────
Temperature:  35% → 37% (+2%)
Error: 15% → 12% (mejora: 3%)

ENTRENAMIENTO #2: Rating 4 ⭐⭐⭐⭐
─────────────────────────────────────
Temperature:  37% → 38% (+1%)
Error: 12% → 10% (mejora: 2%)

ENTRENAMIENTO #3: Rating 5 ⭐⭐⭐⭐⭐
─────────────────────────────────────
Temperature:  38% → 39% (+1%)
History:      20% → 21% (+1%)
Error: 10% → 8% (mejora: 2%)

...

ENTRENAMIENTO #50: Rating 5 ⭐⭐⭐⭐⭐
─────────────────────────────────────
Temperature:  41% (estable)
History:      23% (estable)
Error: 3% (convergencia) ✅

VISUALIZACIÓN:

Error (%)
│
30│ ●                        CONVERGENCIA
  │  ●●                            │
20│     ●●                          │
  │       ●●                        ▼
10│          ●●●●             ●●●●●●●●●
  │               ●●●●●●●●●●●
 0│────────────────────────────────────────►
  0   10   20   30   40   50  Entrenamientos
```

---

## 🎭 CASOS DE USO EXTREMOS

### Caso 1: Usuario Nuevo (Cold Start)

```
┌─────────────────────────────────────────┐
│ PROBLEMA: Sin historial                │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ SOLUCIÓN: Usar otros factores           │
│                                         │
│ • Temperatura (35%) ──────► Alta       │
│ • Disponibilidad (30%) ───► Alta       │
│ • Usuarios similares (8%) ─► CLAVE ✅   │
│ • Historial (20%) ─────────► Neutral   │
└─────────────────────────────────────────┘
         │
         ▼
   Recomendación basada en:
   "Lo que usuarios como tú prefieren"
```

### Caso 2: Sala Siempre Llena

```
┌─────────────────────────────────────────┐
│ PROBLEMA: Sala perfecta pero llena     │
│                                         │
│ Sala A:                                 │
│ • Temperatura: 100% ✅                  │
│ • Tu favorita: 100% ✅                  │
│ • Disponibilidad: 0% ❌                 │
└─────────────────────────────────────────┘
         │
         ▼
Score total:
(1.0×0.35) + (0.0×0.30) + (1.0×0.20) + ...
= 0.35 + 0.00 + 0.20 + ... = 0.65 = 65%

VS

Sala B (alternativa):
• Temperatura: 85%
• Nueva para ti: 50%
• Disponibilidad: 100% ✅
= 0.73 = 73% ← MEJOR OPCIÓN ✅
```

### Caso 3: Horario Inusual

```
USUARIO: Siempre usa salas 9-12h
HORA ACTUAL: 22:00 (noche)
═══════════════════════════════════════════════

Sala A (su favorita):
├─ Temperatura:  100%
├─ Historial:    90%
├─ Disponible:   100%
└─ Temporal:     20% ❌ (nunca viene a esta hora)

Score: 0.35 + 0.27 + 0.18 + ... = 0.81 = 81%

Sala B (nueva):
├─ Temperatura:  95%
├─ Historial:    30%
├─ Disponible:   100%
└─ Temporal:     50% (usado por otros a esta hora)

Score: 0.33 + 0.30 + 0.06 + ... = 0.78 = 78%

→ Sigue recomendando Sala A (su favorita)
→ Pero con menor confianza por el horario
```

---

## 🏆 VENTAJAS DE ESTE SISTEMA

```
┌─────────────────────────────────────────────┐
│  1. TRANSPARENCIA                           │
│  ──────────────                             │
│  Sabemos POR QUÉ recomienda cada sala       │
│  No es una "caja negra"                     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  2. RÁPIDO                                  │
│  ────────                                   │
│  Respuesta en milisegundos                  │
│  No requiere GPUs ni infraestructura cara   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  3. APRENDE CONTINUAMENTE                   │
│  ────────────────────────                   │
│  Cada feedback mejora el modelo             │
│  Sin necesidad de re-entrenar desde cero    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  4. POCOS DATOS NECESARIOS                  │
│  ─────────────────────────                  │
│  Funciona con cientos de registros          │
│  No necesita millones como deep learning    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  5. PERSONALIZADO                           │
│  ──────────────                             │
│  Cada usuario tiene recomendaciones únicas  │
│  Basado en SU historial y SUS preferencias  │
└─────────────────────────────────────────────┘
```

---

## 🎯 RESUMEN EN 3 NIVELES

### Nivel 1: Explicación Simple (para usuarios)
```
El sistema aprende tus gustos:
• Qué salas usas más
• A qué horas las usas
• Qué temperatura prefieres

Y te recomienda la mejor sala para TI en cada momento.

Cuanto más lo uses, mejores recomendaciones tendrás.
```

### Nivel 2: Explicación Técnica (para developers)
```
Sistema híbrido de recomendación que combina:
1. Content-Based Filtering (características de salas)
2. Collaborative Filtering (usuarios similares)
3. Supervised Learning con Gradient Descent

Red neuronal shallow de 6 inputs → 1 output
Pesos adaptativos entrenados con feedback real
Learning rate: 0.05, normalización L1
```

### Nivel 3: Explicación Matemática (para data scientists)
```
Score(u, r) = Σᵢ wᵢ × fᵢ(u, r)

Donde:
• u = usuario
• r = sala
• wᵢ = peso del factor i (Σwᵢ = 1)
• fᵢ = función de score del factor i ∈ [0,1]

Optimización: Gradient Descent
L(w) = (y_true - y_pred)²
w_new = w_old - α × ∂L/∂w

Convergencia garantizada para α pequeño (0.05)
```

---

**FIN DE LA GUÍA VISUAL** 🎨

¿Necesitas más ejemplos o aclaraciones? ¡Pregunta! 😊

