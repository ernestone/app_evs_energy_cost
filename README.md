# EV comparator

Comparador de **uso**: energía y CO₂ de un eléctrico de batería frente a un coche con motor de combustión (gasolina, diésel, híbrido o enchufable), en un país de la UE-27, Estados Unidos o el Reino Unido.

El modelo es opcional. Sin él, el resultado sale de dos cajas de consumo por 100 km, kWh en el eléctrico y litros en el de combustión; vacío o no válido, no se calcula. Esas mismas cajas muestran la cifra del catálogo cuando se elige un coche. En la de litros se puede añadir el kWh de un enchufable y el reparto de kilómetros de cada motor, de partida 50 % y 50 %; si no suman 100, no hay resultado. El precio de compra lo escribe quien compara y empieza vacío: no hay un precio público con licencia para precargarlo. La luz se puede partir en varias filas; si no suman 100 %, no hay resultado. El primer gráfico es el gasto a 5 años, ampliable a 10, 15 o 20. Con los dos precios de compra es compra más energía y marca el equilibrio; si falta uno, es solo la energía. No entran el seguro, el mantenimiento ni la depreciación. Los precios de energía salen de una foto estática fechada. La lista de modelos es la del país: EPA en Estados Unidos y el seguimiento de turismos de la AEMA en la UE-27. El consumo es EPA cuando esa marca y ese modelo están en fueleconomy.gov; si no, es el WLTP publicado, etiquetado y sin convertir un ciclo en el otro. El Reino Unido no tiene lista: la descarga de la VCA no está disponible.

La interfaz está en español (por defecto) y en inglés.

## Arrancar

```bash
npm install
npm run dev
```

Abre [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run build
```

## Foto de datos

Los JSON están en `data/snapshot/`. `vehicles.json` no es el CSV entero: guarda los campos que usa la pantalla, del año modelo 2000 al último del archivo público, sin MSRP.

Para regenerar la foto (hace falta Python con `pandas`, `openpyxl` y `xlrd`, este último para los `.xls` de la EIA):

```bash
pip install pandas openpyxl xlrd
npm run snapshot
```

Si una descarga obligatoria falla, el script se detiene y dice qué fuente falló. No rellena precios a ojo.

## Fuentes

- Estados Unidos, vehículos y consumo EPA: [fueleconomy.gov](https://www.fueleconomy.gov/feg/ws/index.shtml), CSV público.
- UE-27, lista de modelos y WLTP cuando no hay ficha EPA: [seguimiento de CO₂ de turismos de la AEMA](https://co2cars.apps.eea.europa.eu/), licencia [CC BY 2.5 DK](http://creativecommons.org/licenses/by/2.5/dk/deed.en_GB). El agregado está en `data/snapshot/country-catalog.json`. Se regenera con `python3 scripts/build_country_catalog.py`.
- Reino Unido, modelos: la [VCA](https://www.vehicle-certification-agency.gov.uk/information-for-cars/) dice que la base descargable no está disponible. La lista queda vacía.
- Gasolina y diésel UE-27: [Oil Bulletin](https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en), con impuestos. En países fuera del euro, el boletín está en euros y se muestra en la moneda nacional con el tipo BCE del día del boletín (Frankfurter). El precio en euros no se sustituye.
- Luz hogares UE-27: [Eurostat nrg_pc_204](https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table), banda 2.500–4.999 kWh, impuestos incluidos.
- EE. UU.: [EIA](https://www.eia.gov/petroleum/gasdiesel/), un precio nacional de gasolina regular, diésel y luz residencial (tabla 5.3).
- Reino Unido, carburantes: [DESNZ weekly road fuel prices](https://www.gov.uk/government/statistics/weekly-road-fuel-prices).
- Reino Unido, luz: DESNZ Quarterly Energy Prices, tabla 2.2.5, factura media a 3.400 kWh con IVA, dividida por esos kWh.
- CO₂ de la red: [Ember](https://ember-energy.org/data/yearly-electricity-data/), intensidad del sector eléctrico, [CC BY 4.0](https://ember-energy.org/creative-commons/).
- Tipo de cambio de pantalla: [Frankfurter](https://www.frankfurter.app) (referencia del BCE).

El recargo opcional de refinería usa el factor 1,25 de la EPA para la gasolina ([fueleconomy.gov](https://www.fueleconomy.gov/feg/label/calculations-information.shtml), 75 FR 25437). Va apagado. No es específico de un país y no se presenta como cifra oficial de la comparación.
