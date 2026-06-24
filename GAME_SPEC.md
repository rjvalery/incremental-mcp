# ESPECIFICACIÓN TÉCNICA DEFINITIVA: SIMULADOR DE ASENTAMIENTO INCREMENTAL

> **Versión:** 1.0.0  
> **Inspiración:** Kittens Game (clon avanzado con urbanismo orgánico, estaciones climáticas, sistemas políticos y alta finanza)  
> **Propósito:** Única e inalterable especificación técnica de requisitos del proyecto.

---

## 1. Sistema de Recursos e Interdependencias

| Recurso | Descripción | Forma de obtenerlo | Notas |
|---|---|---|---|
| **Comida (food)** | Sustento básico de la población. | Clic manual (+1). Producción pasiva de Granjeros. | Consumo base: **0.05/tick por aldeano**. Si llega a 0 en invierno la mortalidad se duplica. |
| **Madera (wood)** | Recurso constructivo básico. | Clic manual (+1). Producción pasiva de Leñadores. | — |
| **Piedra (stone)** | Recurso de construcción avanzado. | Bloqueado hasta construir la **Cantera** (requiere *Mining*). Producción pasiva de Canteros. | — |
| **Ciencia (science)** | Permite investigar tecnologías. | Producción pasiva de Científicos. | Capacidad máxima inicial: **800**. |
| **Oro (gold)** | Mineral precioso. | Extraído de las **Minas** (requiere *Metal Working*). Producción pasiva de Mineros. | — |
| **Monedas / Dinero (currency)** | Medio de intercambio. | Generado pasivamente por **Banqueros** en el **Banco** (requiere *Currency*). | Usado para el mercado local y expediciones comerciales. |
| **Herramientas (tools)** | Mejora de eficiencia. | Expediciones, mercado o producción especial. | Añaden **+1% de eficiencia** a Granjeros y Leñadores. **Tope: +50%**. |

### Recursos Especiales de Caza

| Recurso | Descripción |
|---|---|
| **Carne** | Alimento almacenable que mitiga el hambre en invierno. |
| **Pieles** | Material para confeccionar abrigos. |
| **Ropa** | Reduce la penalización de consumo y mortalidad por frío en invierno. |
| **Animales Domados** | Aumentan la eficiencia de los Granjeros al arar la tierra (+10% cada uno). |

---

## 2. Ciclo de Estaciones e Impacto Climático

### Motor de tiempo (Calendar)

El calendario cicla entre 4 estaciones. Cada estación dura **120 ticks**.

```
Primavera → Verano → Otoño → Invierno → (repite)
```

### Efectos del Invierno

- **Producción pasiva de Granjeros** disminuye un **75%**.
- **Consumo de comida** de los aldeanos aumenta un **20%** debido al frío extremo.
- La penalización de consumo se anula si los aldeanos poseen **Ropa** en el inventario.
- Si la **comida llega a 0** durante el invierno, la **tasa de mortalidad se duplica**.

---

## 3. Urbanismo, Construcción Pasiva e Inmigración Orgánica

### Zonificación (urbanism)

El jugador compra **Parcelas Residenciales** (`assignedPlots`) usando curvas exponenciales:

```
Costo N-ésima parcela = Costo_Base × 1.15^(Cantidad_Actual)
```

- **Costo Base:** 50 Madera + 1 Casilla de Terreno.

### La Regla del Almacén Vital

El sistema valida que `woodMax` (almacenamiento máximo de madera) sea igual o mayor al costo de la casa **antes** de permitir la zonificación.

### Cobro al Instante

Al asignar una parcela se descuentan los recursos del inventario **inmediatamente**:

```
Costo_Instantáneo = 120 × Nivel_de_Arquitectura
```

Además, se **ocupa 1 casilla** del mapa.

### Construcción por Tiempo

La obra (`buildProgress`) avanza **pasivamente por ticks** usando **Delta Time** (0% → 100%). Durante la construcción, el jugador puede seguir recolectando recursos en paralelo (no se bloquea la UI).

### Inmigración

Cuando hay espacio disponible en `housingMax`, una **barra de inmigración** avanza gradualmente por tick. Al completarse, genera **1 aldeano libre** que puede ser asignado a un rol.

---

## 4. Sistema de Gestión de Territorio (Casillas de Mapa)

### Límite Estricto

El asentamiento inicia con **50 Casillas de Terreno Útil** (`totalPlots`).

### Uso de Casillas

Cada una de las siguientes construcciones consume **exactamente 1 casilla**:

- Parcela residencial
- Almacén
- Corral
- Mina
- Banco
- Cualquier otro edificio industrial

### Fórmula de Disponibilidad

```
Casillas Libres = Casillas Totales − (Parcelas Asignadas + Edificios Industriales)
```

---

## 5. Roles de Población y Producción Pasiva

| Rol | Producción | Requisito | Notas |
|---|---|---|---|
| **Granjero** | +0.15 Comida/seg | Agriculture | Penalización del 75% en invierno. Cada Animal Domado añade +10%. |
| **Leñador** | +0.08 Madera/seg | — | — |
| **Cantero** | +0.05 Piedra/seg | Mining | — |
| **Científico** | +0.05 Ciencia/seg | — | — |
| **Minero** | +0.05 Oro/seg | Metal Working | — |
| **Cazador** | Expedición de Caza | Animal Husbandry | Permite la acción *"Enviar Expedición de Caza"*. Trae Carne y Pieles; 5% de probabilidad de capturar un Animal Salvaje. |
| **Banquero** | +0.10 Monedas/seg | Currency | Trabaja en el Banco. |

---

## 6. Pestaña de Comercio y Expediciones Externas

### Mercado Local

Permite intercambiar recursos básicos de forma manual usando **Monedas**.

| Operación | Costo |
|---|---|
| Comprar Madera | X Monedas |
| Comprar Piedra | X Monedas |

### Expediciones Comerciales

Botón de comerciar con otras civilizaciones. Consume una cantidad fija de **Monedas** + un **recurso excedente**:

```
Costo: 100 Monedas + 400 Madera (o recurso equivalente)
Recompensa: Cargamento aleatorio de recursos escasos o valiosos
           (Piedra, Herramientas, Ciencia, etc.)
```

---

## 7. Árbol de Ciencia Fiel a la Wiki (Fase MVP)

| Tecnología | Costo (Ciencia) | Prerrequisito | Desbloquea |
|---|---|---|---|
| **Calendar** | 30 | — | Tiempo (estaciones, ticks, años) |
| **Agriculture** | 100 | — | Granjeros y Barn (Almacén) |
| **Animal Husbandry** | 500 | — | Cazadores, Carne/Pieles, Corral y domesticación |
| **Mining** | 500 | — | Piedra, Cantera y Canteros |
| **Metal Working** | 900 | Mining | Minas, Oro y Mineros |
| **Construction** | 1300 | — | Log House (vivienda Nivel 2) |
| **Civil Service** | 1500 | — | Gobierno y Sistema Político |
| **Currency** | 2200 | Metal Working + Civil Service | Banco, Banquero, Comercio/Expediciones |

---

## 8. Sistema de Políticas y Gobierno

### Desbloqueo

Requiere la tecnología **Civil Service** (1500 Ciencia).

### Variantes Políticas

El jugador puede elegir una ideología de gobierno. Cada una tiene **bufos y debufos económicos cruzados**:

| Ideología | Efectos |
|---|---|
| **Monarquía** | Bono de producción en tiempos de paz, penalización al cambiar de políticas. |
| **Democracia** | Bonificaciones equilibradas, decisiones más lentas (mayor cooldown). |
| **Capitalismo** | Aumenta generación de Monedas, reduce producción de recursos básicos. |
| **Tecnocracia** | Aumenta generación de Ciencia, reduce bienestar popular (mayor consumo). |

### Mandato de 5 Años (Cooldown)

Al cambiar de política, el botón de cambio se **bloquea por 5 años completos del juego** (años = ticks / 120 estaciones × 4 estaciones).

---

*Esta especificación es la fuente única de verdad para el desarrollo del proyecto. Cualquier desviación debe ser aprobada mediante modificación de este documento.*