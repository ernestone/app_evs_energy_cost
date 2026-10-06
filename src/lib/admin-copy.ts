import type { Lang } from "./types"

export function adminCopy(lang: Lang) {
  const es = lang === "es"
  return {
    title: es ? "Métricas" : "Metrics",
    back: es ? "Volver a la calculadora" : "Back to the calculator",
    signIn: es ? "Entrar con GitHub" : "Sign in with GitHub",
    signOut: es ? "Salir" : "Sign out",
    missingAuth: (names: string) =>
      es
        ? `Faltan estas variables para entrar: ${names}. La calculadora pública sigue funcionando.`
        : `These variables are missing for sign-in: ${names}. The public calculator still works.`,
    signedOut: es ? "Esta página es solo para quien tenga acceso." : "This page is only for people with access.",
    noAccess: es ? "Esta cuenta de GitHub no tiene acceso." : "This GitHub account has no access.",
    session: (login: string) => (es ? `Sesión: ${login}` : `Session: ${login}`),
    roleOwner: es ? "Dueño" : "Owner",
    roleViewer: es ? "Lectura" : "Read only",
    empty: es ? "Aún no hay comparaciones." : "No comparisons yet.",
    stored: (count: number) =>
      es ? `${count} comparaciones guardadas, 12 meses.` : `${count} comparisons stored, 12 months.`,
    mapTitle: es ? "Conexiones" : "Connections",
    mapNote: es
      ? "Un punto por lugar. Si faltan latitud y longitud, el punto es el país. El tamaño crece si se repite. Sin IP."
      : "One point per place. If latitude and longitude are missing, the point is the country. The size grows when it repeats. No IP.",
    yearTitle: es ? "Comparaciones acumuladas por año" : "Comparisons accumulated by year",
    monthTitle: es ? "Por mes" : "By month",
    kmTitle: es ? "Kilómetros al año" : "Kilometres per year",
    modelsTitle: es ? "Modelos más consultados" : "Most queried models",
    countryTitle: es ? "País elegido" : "Selected country",
    connectionTitle: es ? "País de la conexión" : "Connection country",
    languageTitle: es ? "Idioma" : "Language",
    currencyTitle: es ? "Moneda de pantalla" : "Display currency",
    fuelTitle: es ? "Combustible" : "Fuel",
    phevTitle: "PHEV",
    horizonTitle: es ? "Horizonte" : "Horizon",
    recent: es ? "Comparaciones recientes" : "Recent comparisons",
    when: es ? "Fecha" : "Date",
    selected: es ? "País elegido" : "Selected country",
    connection: es ? "País de la conexión" : "Connection country",
    region: es ? "Región" : "Region",
    language: es ? "Idioma" : "Language",
    currency: es ? "Moneda" : "Currency",
    km: es ? "km/año" : "km/year",
    fuel: es ? "Combustible" : "Fuel",
    horizon: es ? "Horizonte" : "Horizon",
    purchaseEv: es ? "Precio eléctrico" : "Electric price",
    purchaseIce: es ? "Precio combustión" : "Combustion price",
    models: es ? "Modelos" : "Models",
    allowTitle: es ? "Quién puede ver" : "Who can view",
    allowHint: es
      ? "El dueño añade o quita un usuario de GitHub. El dueño no se quita de esta lista."
      : "The owner adds or removes a GitHub login. The owner is not removed from this list.",
    add: es ? "Añadir" : "Add",
    remove: es ? "Quitar" : "Remove",
    loginLabel: es ? "Usuario de GitHub" : "GitHub login",
    updateTitle: es ? "Actualizar datos" : "Update data",
    snapshot: (date: string) => (es ? `Última foto: ${date}.` : `Latest snapshot: ${date}.`),
    missingToken: es
      ? "Falta DATA_UPDATE_TOKEN. Sin esa clave el botón no lanza la actualización en GitHub."
      : "DATA_UPDATE_TOKEN is missing. Without that key the button does not start the GitHub update.",
    launch: es ? "Lanzar actualización" : "Start update",
    running: es ? "La actualización está en marcha." : "The update is running.",
    idle: es ? "No hay una actualización en marcha." : "No update is running.",
    updateError: es ? "No se pudo consultar el estado." : "The status could not be read.",
    started: es ? "Actualización lanzada." : "Update started.",
    failed: es ? "No se pudo lanzar." : "It could not be started.",
    badLogin: es ? "Ese usuario no vale, o es el dueño." : "That login is not valid, or it is the owner.",
    forbidden: es ? "Solo el dueño puede cambiar esto." : "Only the owner can change this.",
    noStore: es ? "No hay almacén. Falta DATABASE_URL." : "There is no store. DATABASE_URL is missing.",
    repo: (name: string) => (es ? `Repositorio: ${name}.` : `Repository: ${name}.`),
    gasoline: es ? "Gasolina" : "Gasoline",
    diesel: es ? "Diésel" : "Diesel",
    on: es ? "Encendido" : "On",
    off: es ? "Apagado" : "Off",
    noModel: es ? "Sin modelo" : "No model",
    electric: es ? "Eléctrico" : "Electric",
    combustion: es ? "Combustión" : "Combustion",
    unknown: es ? "Sin dato" : "Unknown",
    countryPoint: es ? "país" : "country",
  }
}

export type AdminCopy = ReturnType<typeof adminCopy>
