/* =========================================================
   PRODUCTOS CAJA AREQUIPA que coloca SEJ Partners
   Para agregar/quitar productos solo edita este archivo.
   Las condiciones (montos, tasas, plazos) se confirman siempre
   con el tarifario vigente de Caja Arequipa.
   ========================================================= */
export const products = {
  negocios: [
    {
      icon: 'ri-rocket-2-line',
      title: 'Crédito Emprendedor',
      description: 'Para emprendedores que inician o están formalizando su negocio.',
      features: ['Capital de trabajo', 'Negocios en crecimiento', 'Atención personalizada'],
      badge: 'Foco del mes',
    },
    {
      icon: 'ri-store-2-line',
      title: 'Crédito para PYMES',
      description: 'Financiamiento para pequeñas y medianas empresas que buscan crecer.',
      features: ['Capital de trabajo', 'Activo fijo: maquinaria y equipo', 'Local comercial'],
    },
    {
      icon: 'ri-refresh-line',
      title: 'Línea de Crédito para Negocios',
      description: 'Fondos disponibles para necesidades variables del negocio.',
      features: ['Disponibilidad rápida', 'Uso según necesidad', 'Clientes recurrentes'],
    },
    {
      icon: 'ri-plant-line',
      title: 'Crédito Agropecuario',
      description: 'Para productores agrícolas y ganaderos según su ciclo productivo.',
      features: ['Campaña agrícola', 'Ganadería', 'Cuotas acordes a la cosecha'],
    },
    {
      icon: 'ri-women-line',
      title: 'Crédito Súperate Mujer',
      description: 'Dirigido a mujeres emprendedoras que quieren impulsar su negocio.',
      features: ['Mujeres emprendedoras', 'Capital de trabajo', 'Crecimiento del negocio'],
    },
  ],
  consumo: [
    {
      icon: 'ri-user-smile-line',
      title: 'Personal Directo',
      description: 'Préstamo de libre disponibilidad para necesidades personales.',
      features: ['Libre disponibilidad', 'Cuotas fijas', 'Trabajadores dependientes e independientes'],
    },
    {
      icon: 'ri-building-4-line',
      title: 'Convenio por Planilla',
      description: 'Las cuotas se descuentan directamente de la planilla del trabajador.',
      features: ['Empresas con convenio', 'Descuento automático', 'Menor riesgo de mora'],
    },
    {
      icon: 'ri-vip-diamond-line',
      title: 'Crédito Prendario',
      description: 'Préstamo con garantía de joyas de oro.',
      features: ['Garantía prendaria', 'Desembolso rápido', 'Sin evaluación compleja'],
    },
    {
      icon: 'ri-car-line',
      title: 'Crédito Vehicular',
      description: 'Para la compra de vehículo nuevo o usado, de uso personal o de trabajo.',
      features: ['Vehículos nuevos y usados', 'Uso familiar o de trabajo', 'Cuota inicial'],
    },
  ],
  vivienda: [
    {
      icon: 'ri-home-4-line',
      title: 'Crédito Mivivienda',
      description: 'Compra de vivienda con el respaldo del Fondo Mivivienda.',
      features: ['Bono del Buen Pagador', 'Vivienda nueva o usada', 'Plazos largos'],
    },
    {
      icon: 'ri-home-heart-line',
      title: 'Crédito Techo Propio',
      description: 'Financiamiento complementario para vivienda de interés social.',
      features: ['Bono Familiar Habitacional', 'Familias de menores ingresos', 'Programa del Estado'],
    },
    {
      icon: 'ri-hammer-line',
      title: 'Caja Construye',
      description: 'Para construir, ampliar o mejorar la vivienda.',
      features: ['Construcción', 'Ampliación', 'Mejoramiento'],
    },
    {
      icon: 'ri-community-line',
      title: 'Hipotecario Vivienda',
      description: 'Crédito hipotecario tradicional para adquirir vivienda.',
      features: ['Garantía hipotecaria', 'Compra de vivienda', 'Plazos largos'],
    },
  ],
};
