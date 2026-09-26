# Paralelo

Comparador de **uso**: energía y CO₂ de un eléctrico de batería frente a un coche con motor de combustión (gasolina, diésel, híbrido o enchufable), en un país de la UE-27, Estados Unidos o el Reino Unido.

No calcula la compra, el seguro ni el mantenimiento. Los precios salen de una foto estática fechada. El consumo sale de la EPA (fueleconomy.gov).

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

- Vehículos: [fueleconomy.gov](https://www.fueleconomy.gov/feg/ws/index.shtml), CSV público.
- Gasolina y diésel UE-27: [Oil Bulletin](https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en), con impuestos. En países fuera del euro, el boletín está en euros y se muestra en la moneda nacional con el tipo BCE del día del boletín (Frankfurter). El precio en euros no se sustituye.
- Luz hogares UE-27: [Eurostat nrg_pc_204](https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table), banda 2.500–4.999 kWh, impuestos incluidos.
- EE. UU.: [EIA](https://www.eia.gov/petroleum/gasdiesel/), un precio nacional de gasolina regular, diésel y luz residencial (tabla 5.3).
- Reino Unido, carburantes: [DESNZ weekly road fuel prices](https://www.gov.uk/government/statistics/weekly-road-fuel-prices).
- Reino Unido, luz: DESNZ Quarterly Energy Prices, tabla 2.2.5, factura media a 3.400 kWh con IVA, dividida por esos kWh.
- CO₂ de la red: [Ember](https://ember-energy.org/data/yearly-electricity-data/), intensidad del sector eléctrico, [CC BY 4.0](https://ember-energy.org/creative-commons/).
- Tipo de cambio de pantalla: [Frankfurter](https://www.frankfurter.app) (referencia del BCE).

El recargo opcional de refinería usa el factor 1,25 de la EPA para la gasolina ([fueleconomy.gov](https://www.fueleconomy.gov/feg/label/calculations-information.shtml), 75 FR 25437). Va apagado. No es específico de un país y no se presenta como cifra oficial de la comparación.
