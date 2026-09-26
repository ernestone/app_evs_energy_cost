import type { Boundary } from "./calc"
import type { Lang } from "./types"

export function copy(lang: Lang) {
  const es = lang === "es"
  return {
    name: "Paralelo",
    tagline: es
      ? "Cuánto cuestan la energía y el CO₂ de usar dos coches, en un país."
      : "What the energy and CO₂ of using two cars cost, in one country.",
    notTco: es
      ? "No es el coste de comprar, asegurar ni mantener el coche."
      : "This is not the cost of buying, insuring, or maintaining the car.",
    langEs: "Español",
    langEn: "English",
    currencyLabel: es ? "Moneda en pantalla" : "Display currency",
    steps: {
      country: es ? "País y precios" : "Country and prices",
      ev: es ? "Eléctrico de batería" : "Battery electric",
      ice: es ? "Combustión, híbrido o enchufable" : "Combustion, hybrid, or plug-in",
      distance: es ? "Kilómetros y ciudad" : "Kilometres and city",
      results: es ? "Resultados" : "Results",
      sources: es ? "De dónde sale" : "Where this comes from",
    },
    countryHint: es
      ? "UE-27, Estados Unidos y Reino Unido. Otro país no entra en esta versión."
      : "EU-27, the United States, and the United Kingdom. Other countries are out of this version.",
    chooseCountry: es ? "Elige un país" : "Choose a country",
    gasoline: es ? "Gasolina" : "Gasoline",
    diesel: es ? "Diésel" : "Diesel",
    electricity: es ? "Electricidad" : "Electricity",
    perLiter: es ? "por litro" : "per litre",
    perKwh: es ? "por kWh" : "per kWh",
    official: es ? "oficial" : "official",
    yours: es ? "tuyo" : "yours",
    reset: es ? "Volver al oficial" : "Restore official",
    missingOfficial: es ? "Sin precio oficial. Escríbelo para calcular." : "No official price. Type one to calculate.",
    gridLabel: es ? "Red eléctrica" : "Electricity grid",
    gridUnit: "gCO₂/kWh",
    yearWord: es ? "Año" : "Year",
    make: es ? "Marca" : "Make",
    model: es ? "Modelo" : "Model",
    powertrain: {
      ev: es ? "batería" : "battery",
      gasoline: es ? "gasolina" : "gasoline",
      diesel: es ? "diésel" : "diesel",
      hev: es ? "híbrido" : "hybrid",
      ffv: es ? "flexible" : "flex-fuel",
      phev: es ? "enchufable" : "plug-in",
    },
    version: es ? "Versión" : "Version",
    filter: es ? "Filtrar la lista" : "Filter the list",
    noModelMatch: es
      ? "Ningún modelo de esta marca en el catálogo del país contiene ese texto."
      : "No model of this make in this country’s catalog contains that text.",
    needCountry: es ? "Elige antes el país. La lista de modelos sale de ese país." : "Choose the country first. The model list comes from that country.",
    catalogFailed: es ? "Este país no tiene catálogo en la foto. Falló esta fuente:" : "This country has no catalog in the snapshot. This source failed:",
    epaTrimNote: es
      ? "El consumo es EPA: misma marca y mismo modelo. Las versiones no coinciden una a una con el coche vendido en este país."
      : "Consumption is EPA: same make and model. Trims do not match the car sold in this country one for one.",
    epaNames: (catalogName: string, epaName: string) =>
      es
        ? `En el catálogo del país el nombre es ${catalogName}. En la EPA es ${epaName}. No se tratan como el mismo coche si el nombre no coincide; aquí sí coincide la marca y el modelo. Las versiones pueden diferir. El consumo es EPA.`
        : `The country catalog calls it ${catalogName}. The EPA file calls it ${epaName}. Different names are not treated as the same car; this match is the same make and model. Trims can differ. Consumption is EPA.`,
    listedAs: (name: string) => (es ? `Nombre en el catálogo del país: ${name}.` : `Name in the country catalog: ${name}.`),
    wltpCombinedOnly: es
      ? "Solo hay combinado. El archivo no publica ciudad y carretera, así que el reparto 55/45 no mueve esta cifra."
      : "Only the combined figure is published. That file has no city and highway split, so the 55/45 control does not move this number.",
    wltpPhevNoCs: es
      ? "El enchufable muestra el consumo oficial del archivo (Fc, Z y CO₂ Ewltp, cada uno con su etiqueta). No hay una columna aparte de batería agotada, así que no se inventa."
      : "The plug-in shows the file’s official figures (Fc, Z, and Ewltp CO₂), each labeled. There is no separate charge-sustaining column, so none is invented.",
    cycleLink: es ? "Ciclo" : "Cycle",
    splitSkipped: es
      ? "Si un coche es solo WLTP, su cifra sigue siendo el combinado de esa fuente. El 55/45 solo cambia los coches EPA que traen ciudad y carretera."
      : "A WLTP-only car stays on that source’s combined figure. 55/45 only changes EPA cars that publish city and highway.",
    choose: es ? "Elegir" : "Choose",
    loading: es ? "Cargando el catálogo…" : "Loading the catalog…",
    catalogNote: es
      ? "La lista es la del país. Si esa marca y ese modelo están en la EPA, el consumo es EPA y se etiqueta así. Si no, es WLTP, también etiquetado. No se convierte un ciclo en el otro."
      : "The list is the country’s. If that make and model are in the EPA file, consumption is EPA and labeled as such. Otherwise it is WLTP, also labeled. One cycle is not converted into the other.",
    iceNote: es
      ? "Gasolina, diésel, híbrido no enchufable y enchufable. El lado eléctrico solo admite batería, sin motor de combustión."
      : "Gasoline, diesel, non-plug-in hybrid, and plug-in hybrid. The electric side is battery-only.",
    premiumWarn: es
      ? "Esta ficha pide gasolina premium. Se usa el precio de gasolina del país: muchos no publican el de 98 octanos. Puedes corregirlo."
      : "This listing asks for premium gasoline. The country’s gasoline price is used: many do not publish a 98-octane series. You can edit it.",
    ffvNote: es
      ? "Es flexible (gasolina y E85). Se usa el consumo de gasolina de la EPA, no el de E85."
      : "This is a flex-fuel vehicle. The gasoline EPA figure is used, not the E85 figure.",
    estimated: es ? "CO₂ estimado (año modelo anterior a 2013)" : "CO₂ estimated (model year before 2013)",
    kmYear: es ? "Kilómetros al año" : "Kilometres per year",
    kmMonth: es ? "Kilómetros al mes" : "Kilometres per month",
    city: es ? "Ciudad" : "City",
    highway: es ? "Carretera" : "Highway",
    splitNote: es
      ? "El 55 % / 45 % es el combinado que publica la EPA. Si lo mueves, la gasolina usa media armónica de MPG y el eléctrico pondera los kWh/100 millas por los kilómetros."
      : "55% / 45% is the EPA combined rating. If you move it, gasoline uses a harmonic mean of MPG and electricity weights kWh/100 miles by distance.",
    splitChanged: es ? "Reparto distinto del 55/45: la cuenta ya no usa el combinado publicado." : "Split is no longer 55/45: the published combined figure is not used.",
    upstream: es ? "Recargo de refinería y aguas arriba" : "Refinery and upstream surcharge",
    upstreamHelp: es
      ? "Apagado por defecto. Suma un 25 % al CO₂ de tubo de escape de la gasolina, el factor 1,25 de la EPA (75 FR 25437, 7 de mayo de 2010). No es de un país concreto y no es una cifra oficial de esta comparación. No se aplica al diésel: esa página no publica otro multiplicador. No se aplica a la electricidad."
      : "Off by default. Adds 25% to gasoline tailpipe CO₂, the EPA 1.25 factor (75 FR 25437, May 7, 2010). It is not country-specific and it is not an official figure for this comparison. It does not apply to diesel: that page does not publish a separate multiplier. It does not apply to electricity.",
    phevTitle: es ? "Cómo contar el enchufable" : "How to count the plug-in",
    phevEpa: es ? "Combinado oficial EPA, con su factor de uso" : "Official EPA combined, including its utility factor",
    phevCustom: es ? "Uso ajustable: parte de los km en eléctrico" : "Adjustable use: share of km on electricity",
    phevIcct26: es ? "ICCT 2022, recorte publicado menor (−26 %)" : "ICCT 2022, lower published cut (−26%)",
    phevIcct56: es ? "ICCT 2022, recorte publicado mayor (−56 %)" : "ICCT 2022, higher published cut (−56%)",
    phevShare: es ? "Parte de los kilómetros con electricidad" : "Share of kilometres on electricity",
    phevAssumption: es
      ? "El valor inicial del uso ajustable es la mitad del factor de uso oficial de la EPA. No es una medición de este coche: es un supuesto editable, por debajo de la etiqueta. Los dos recortes ICCT son los extremos del intervalo que publicaron Isenstadt, Yang, Searle y German en diciembre de 2022 para Estados Unidos (la parte eléctrica real puede ser un 26–56 % menor). Se aplican igual a todos los coches; no son un dato de este modelo. El consumo de gasolina es el de batería agotada (charge-sustaining)."
      : "The adjustable mode starts at half the official EPA utility factor. That is not a measurement of this car: it is an editable assumption, below the label. The two ICCT cuts are the ends of the range published by Isenstadt, Yang, Searle, and German in December 2022 for the United States (real-world electric share may be 26–56% lower). The same cut is applied to every car; it is not a figure for this model. Gasoline use is the charge-sustaining, battery-depleted figure.",
    officialUf: es ? "Factor de uso EPA" : "EPA utility factor",
    emptyTitle: es ? "Aún no hay comparación" : "No comparison yet",
    emptyBody: es
      ? "Elige un país, un eléctrico de batería y un coche con motor de combustión."
      : "Choose a country, a battery electric vehicle, and a car with a combustion engine.",
    missingPriceTitle: es ? "Falta un precio" : "A price is missing",
    missingPriceBody: es
      ? "El resultado no se calcula hasta rellenar los precios que usa esta pareja de coches. No se inventa una cifra."
      : "The result stays hidden until the prices this pair of cars needs are filled in. No figure is invented.",
    missingUseTitle: es ? "Falta el consumo" : "Consumption is missing",
    missingUseBody: es
      ? "La ficha EPA no trae el MPG o los kWh/100 millas que hacen falta. No se inventa un consumo."
      : "The EPA listing has no MPG or kWh/100 miles for this calculation. No consumption figure is invented.",
    invalidKm: es ? "Los kilómetros al año tienen que ser mayores que cero." : "Kilometres per year have to be greater than zero.",
    perYear: es ? "al año" : "per year",
    perMonth: es ? "al mes" : "per month",
    per100: es ? "por 100 km" : "per 100 km",
    energyTitle: es ? "Energía" : "Energy",
    energyUnit: es ? "kWh equivalentes por 100 km" : "kWh-equivalent per 100 km",
    co2Title: "CO₂",
    co2Year: es ? "al año" : "per year",
    tonnes: "t",
    gPerKm: "g/km",
    projectionTitle: es ? "Cinco años" : "Five years",
    projectionNote: es
      ? "Proyección: el gasto de cada año multiplicado por el número de años, con los precios congelados. No es un pronóstico."
      : "Projection: each year’s energy spend multiplied by the year number, with prices frozen. Not a forecast.",
    noWinner: es
      ? "No hay un ganador único. El dinero y el CO₂ se leen por separado: uno puede bajar y el otro subir."
      : "There is no single winner. Money and CO₂ are read separately: one can fall while the other rises.",
    litersYear: es ? "litros al año" : "litres per year",
    kwhYear: es ? "kWh al año" : "kWh per year",
    range: es ? "Autonomía EPA" : "EPA range",
    electricRange: es ? "Autonomía eléctrica EPA" : "EPA electric range",
    charge: es ? "Horas a 240 V" : "Hours at 240 V",
    noRange: es ? "La ficha no trae autonomía." : "The listing has no range.",
    evSeries: es ? "Eléctrico" : "Electric",
    iceSeries: es ? "Combustión" : "Combustion",
    assumptionsTitle: es ? "Supuestos a la vista" : "Assumptions in view",
    assumptions: es
      ? [
          "La luz es el promedio doméstico del país, con impuestos. No es la tarifa valle ni el cargador rápido.",
          "La gasolina y el diésel son precios al consumidor con impuestos, no el surtidor de una esquina.",
          "Estados Unidos lista los coches de fueleconomy.gov. La UE-27 lista el seguimiento de la AEMA. El Reino Unido no copia ninguna de las dos: si su archivo no se pudo abrir, la lista queda vacía.",
          "Esto no incluye comprar el coche, el seguro, el mantenimiento, el punto de carga ni la fabricación de la batería.",
          "La intensidad de Ember es la de generar electricidad en ese territorio, del año que indica la ficha. No se añade un factor de pérdidas de red.",
          "El gráfico de cinco años congela el precio de hoy. Es una proyección, no un pronóstico.",
        ]
      : [
          "Electricity is the country’s household average, taxes included. It is not a night rate and not fast charging.",
          "Gasoline and diesel are consumer prices with tax, not one station on one corner.",
          "The United States lists fueleconomy.gov cars. The EU-27 lists the EEA monitoring file. The United Kingdom does not copy either list: if its file could not be opened, the list stays empty.",
          "Buying the car, insurance, maintenance, a home charger, and building the battery are not included.",
          "Ember’s intensity is for generating electricity in that territory, for the year on the card. No grid-loss factor is added.",
          "The five-year chart freezes today’s price. It is a projection, not a forecast.",
        ],
    fxLine: es ? "Tipo de cambio" : "Exchange rate",
    fxSource: es
      ? "BCE a través de Frankfurter. Cambiar la moneda de pantalla no sustituye el precio de la fuente."
      : "ECB via Frankfurter. Switching the display currency does not replace the source price.",
    sameCurrency: es
      ? "Los precios de origen ya están en esta moneda."
      : "Source prices are already in this currency.",
    sourcePricesStay: es ? "Precios de origen en" : "Source prices stay in",
    sourcesIntro: es
      ? "Foto estática en el repositorio. El navegador no llama a APIs de pago."
      : "Static snapshot in the repository. The browser does not call paid APIs.",
    epa: "EPA / DOE, fueleconomy.gov",
    oil: es ? "Comisión Europea, Oil Bulletin semanal, con impuestos" : "European Commission Weekly Oil Bulletin, prices with taxes",
    eurostat: es
      ? "Eurostat nrg_pc_204, hogares, banda 2.500–4.999 kWh, impuestos incluidos"
      : "Eurostat nrg_pc_204, households, 2,500–4,999 kWh band, all taxes included",
    eia: es
      ? "EIA: gasolina regular y diésel semanales de EE. UU., y luz residencial nacional (tabla 5.3)"
      : "EIA: weekly U.S. regular gasoline and diesel, and national residential electricity (table 5.3)",
    desnzFuel: es ? "DESNZ, precios semanales de carburante en el Reino Unido" : "DESNZ weekly UK road fuel prices",
    desnzPower: es
      ? "DESNZ, Quarterly Energy Prices, tabla 2.2.5: factura media estándar a 3.400 kWh, en efectivo, con IVA, dividida por esos kWh"
      : "DESNZ Quarterly Energy Prices, table 2.2.5: average standard bill at 3,400 kWh, cash terms, VAT included, divided by those kWh",
    ember: es
      ? "Ember, datos anuales de electricidad, intensidad de CO₂ del sector eléctrico. Licencia CC BY 4.0."
      : "Ember yearly electricity data, power-sector CO₂ intensity. CC BY 4.0.",
    eea: es
      ? "Agencia Europea de Medio Ambiente, seguimiento de CO₂ de turismos. La lista de la UE-27 y, si no hay ficha EPA, el WLTP combinado (Fc en l/100 km, Ewltp en g/km, Z en Wh/km)."
      : "European Environment Agency, monitoring of CO₂ from passenger cars. The EU-27 list and, when there is no EPA listing, the combined WLTP figure (Fc in l/100 km, Ewltp in g/km, Z in Wh/km).",
    vcaFailed: es
      ? "Reino Unido: la base descargable de la VCA no está disponible. No se ha copiado la lista de otro país."
      : "United Kingdom: the downloadable VCA database is unavailable. No other country’s list was copied in.",
    vehiclesKept: es
      ? "El JSON de coches guarda solo los campos de esta pantalla, desde el año modelo 2000. Sin MSRP."
      : "The vehicle JSON keeps only the fields this screen uses, from model year 2000. No MSRP.",
    boundary: (boundary: Boundary) => boundaryLabel(boundary, es),
  }
}

function boundaryLabel(boundary: Boundary, es: boolean) {
  const table: Record<Boundary, [string, string]> = {
    tailpipe: ["Tubo de escape", "Tailpipe"],
    "tailpipe-upstream": [
      "Tubo de escape más recargo de refinería (no oficial, no es de un país)",
      "Tailpipe plus refinery surcharge (not official, not country-specific)",
    ],
    grid: ["Generación eléctrica (Ember)", "Electricity generation (Ember)"],
    "tailpipe-grid": ["Tubo de escape y generación eléctrica", "Tailpipe and electricity generation"],
    "tailpipe-upstream-grid": [
      "Tubo de escape, recargo de refinería y generación eléctrica",
      "Tailpipe, refinery surcharge, and electricity generation",
    ],
  }
  return es ? table[boundary][0] : table[boundary][1]
}

export type Copy = ReturnType<typeof copy>
