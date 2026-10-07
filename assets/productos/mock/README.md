# Modelo 3D de prueba

La galería del detalle de producto (el modal de `index.html`) muestra este modelo 3D en **todos** los productos.
Las fotos de cada producto salen del catálogo, así que acá van solo los archivos del 3D.
Las rutas se configuran en `MODELO_3D`, arriba de todo en `assets/js/galeria.js`.

## Archivos

| Archivo | Obligatorio | Especificación |
|---|---|---|
| `modelo.glb` | Sí | glTF 2.0 binario, escala real en metros, origen en la base, menos de 100k triángulos, ≤ 3 MB, compresión Meshopt o Draco, texturas WebP de 2K máx. |
| `modelo.usdz` | Para AR en iPhone | Mismo modelo exportado a USDZ. Cuando lo agregues, poné su ruta en `usdz` dentro de `MODELO_3D` (hoy está vacío y model-viewer genera el USDZ solo a partir del GLB). |
| `poster.webp` | Sí | Captura del modelo, mismo encuadre que la cámara inicial (`camera-orbit="-30deg 75deg 105%"`), proporción 4:5 como la galería, ~1200 px de alto. Con fondo transparente se adapta a los tres temas de color. |

**Ahora hay archivos temporales:** `modelo.glb` es *GlamVelvetSofa* de [Khronos glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa),
© 2021 Wayfair, LLC (modelo de Eric Chadwick), licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
`poster.webp` es una captura de ese mismo modelo. Si se usan en público hay que mantener el crédito. Reemplazalos por el modelo propio.

## Optimizar el modelo

```bash
npx @gltf-transform/cli optimize entrada.glb modelo.glb --compress meshopt --texture-compress webp --texture-size 2048
```

Para revisar el resultado (triángulos, peso, texturas):

```bash
npx @gltf-transform/cli inspect modelo.glb
```

## Presentar sin internet

- La compresión de geometría (Meshopt o Draco) necesita decodificadores que model-viewer descarga de su CDN. Sin internet el modelo no carga.
  Para presentar offline conviene un GLB sin compresión de geometría: `--compress false` (o `--compress quantize`, que no necesita decodificador).
- Las texturas WebP las decodifica el navegador, no hace falta descargar nada.
- El propio model-viewer también viene de un CDN (`ajax.googleapis.com`). Para presentar sin internet hay que descargar
  `model-viewer.min.js` 3.5.0, ponerlo en el proyecto y cambiar la ruta en `MODEL_VIEWER_JS` (`assets/js/galeria.js`).
