# **App Name**: ArchiPlanAI

## Core Features:

- Project Details Input: Form to capture project details (name, description, type, location, budget, requirements, preferences).
- Initial Plan Generation: Use the project details captured to generate an initial project plan with phases, estimated duration, and high-level costs using a generative AI tool.
- Plan Display and Editing: Display the initial project plan in a table format, showing phases, estimated duration, and costs. Allow editing of duration and cost values.
- Budget Summary: Show a budget summary, comparing total budget vs. the sum of phase costs. Alert the user if costs exceed the budget.
- Plan Saving: Enable saving the initial plan, including project details and phase breakdown.

## Style Guidelines:

- Primary color: A calming blue (#3498db) to inspire trust and reliability.
- Secondary color: A neutral grey (#ecf0f1) for backgrounds and less important elements.
- Accent: A vibrant green (#2ecc71) to highlight actions and key information.
- Clean and readable sans-serif fonts for form labels and data display.
- Use a clear, tabular layout for displaying project phases and budget information.
- Simple, professional icons to represent project types and actions.

## Original User Request:
quiero que arranques un proyecto usando react para el seguimiento de proyectos de construccion, aqui un ejemplo del MVP del flujo inicial de lo que se quiere
¡Entendido! Con gusto te ayudo a responder esas preguntas iniciales desde una perspectiva de gestión de proyectos y pensando en la escalabilidad de "ArchiPlan AI".

Propuesta de Estructura de Datos Inicial (MVP):

Para almacenar la información inicial del proyecto, incluyendo el presupuesto y la planificación inicial (fases, duración estimada, costo estimado), propongo la siguiente estructura de datos conceptual:

JSON

{
  "proyecto": {
    "id": "UUID generado automáticamente",
    "nombre": "Texto",
    "descripcion": "Texto (opcional)",
    "tipo": "Texto (ej. 'Casa nueva', 'Remodelación total')",
    "ubicacion": "Texto (opcional)",
    "presupuesto_total_estimado": "Número (flotante)",
    "moneda": "Texto (ej. 'COP', 'USD')",
    "requisitos_funcionales": "Texto",
    "preferencias_esteticas": "Texto (opcional)",
    "fecha_creacion": "Timestamp"
  },
  "planificacion_inicial": [
    {
      "id": "UUID generado automáticamente",
      "proyecto_id": "Referencia al ID del proyecto",
      "nombre_fase": "Texto",
      "duracion_estimada": "Número (días)",
      "costo_estimado_alto_nivel": "Número (flotante)",
      "orden": "Número (para secuenciar las fases)"
    }
  ]
}
Consideraciones para la Escalabilidad en la Estructura:

IDs Únicos (UUID): Utilizar UUIDs para identificar tanto el proyecto como cada fase permitirá una gestión más sencilla y evitará conflictos a medida que la aplicación crezca y maneje múltiples proyectos.
Relación Proyecto-Planificación: La clave proyecto_id en el array planificacion_inicial establece una relación clara entre cada fase y el proyecto al que pertenece. Esto será fundamental para consultas y gestión de datos.
Campo "Tipo" de Proyecto: Este campo es crucial para que Gemini genere planificaciones iniciales relevantes y para futuras funcionalidades específicas por tipo de proyecto (ej. flujos de trabajo predefinidos, consideraciones regulatorias).
Campo "Orden" de Fase: Permite mantener la secuencia lógica de las fases, independientemente del orden en que se creen o modifiquen.
Consideraciones Técnicas para la Integración con la API de Gemini:

Formato de la Solicitud a Gemini: La solicitud a Gemini podría ser un objeto JSON o un string que contenga la información clave del proyecto:

JSON

{
  "tipo_proyecto": "Casa nueva",
  "requisitos_funcionales": "3 habitaciones, 2 baños, cocina abierta",
  "presupuesto_total": 150000000,
  "descripcion_opcional": "Casa de dos pisos con jardín"
}
O un prompt de lenguaje natural:

"Generar una planificación inicial con duración estimada y costo de alto nivel para la construcción de una casa nueva de 3 habitaciones y 2 baños con un presupuesto de 150 millones de pesos colombianos."
La elección dependerá de la complejidad de la lógica que queramos que Gemini aplique. Inicialmente, un prompt más estructurado podría ser más fácil de manejar.

Interpretación de la Respuesta de Gemini: Esperaríamos que Gemini devolviera una estructura de datos similar a nuestro planificacion_inicial, con los nombres de las fases, la duración estimada y el costo estimado de alto nivel. Deberemos tener lógica en nuestra aplicación para parsear esta respuesta y guardarla en nuestra base de datos.

Flexibilidad de Gemini: Es importante diseñar la interacción con Gemini de manera que sea flexible y permita ajustes futuros. Podríamos empezar con prompts más generales y luego refinar las instrucciones a medida que entendamos mejor las capacidades de Gemini y las necesidades de nuestros usuarios.

Representación Visual Inicial de la Planificación:

Para el MVP, una representación visual clara y sencilla sería lo ideal:

Listado de Fases con Detalles: Una tabla o lista donde cada fila represente una fase, mostrando el nombre de la fase, la duración estimada y el costo estimado de alto nivel. Podríamos incluir iconos para diferenciar visualmente las fases.
Barra de Progreso del Presupuesto (Opcional): Una barra visual simple que muestre el presupuesto total y el porcentaje ya "asignado" a las fases planificadas. Esto daría una idea rápida de cuánto del presupuesto se ha considerado en la planificación inicial.
Bocetos Básicos de la Interfaz de Usuario para el Flujo Inicial:

Aquí te presento una descripción textual de los bocetos iniciales para el flujo de inicio de proyecto:

Pantalla de "Nuevo Proyecto":

Título: Crear Nuevo Proyecto
Formulario:
Campo de texto: "Nombre del Proyecto" (obligatorio)
Área de texto: "Descripción del Proyecto" (opcional)
Menú desplegable: "Tipo de Proyecto" (obligatorio) - (Casa nueva, Remodelación...)
Campo de texto: "Ubicación del Proyecto" (opcional)
Campo numérico: "Presupuesto Total Estimado" (obligatorio) con etiqueta de moneda predeterminada (COP) o un desplegable para cambiarla.
Área de texto: "Requisitos Funcionales Principales" (obligatorio) - Instrucciones para describir brevemente los espacios y necesidades.
Área de texto: "Preferencias Estéticas" (opcional)
Botón primario: "Generar Planificación Inicial"
Pantalla de "Revisión de Planificación Inicial":

Título: Revisar Planificación Inicial
Listado de Fases:
Tabla con columnas: "Fase", "Duración Estimada (días)", "Costo Estimado (COP)".
Cada fila mostraría una fase generada por Gemini.
Campos editables para la duración y el costo de cada fase.
Resumen del Presupuesto:
Texto: "Presupuesto Total: [Presupuesto Total Ingresado]"
Texto: "Costo Estimado Total de la Planificación: [Suma de costos estimados de las fases]"
Alerta visual (ej. texto en rojo) si el costo estimado total excede el presupuesto total.
Botones:
Botón secundario: "Volver" (para editar la información del proyecto)
Botón primario: "Guardar Planificación y Continuar"
  