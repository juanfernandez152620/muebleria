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

**Ahora hay archivos de prueba:** `modelo.glb` es una estantería exportada de Blender, con las texturas reducidas de 4K a 2K WebP
(de 10,8 MB a 0,5 MB). `poster.webp` es una captura de ese modelo con la cámara inicial.
Ojo: el modelo mide 10,2 × 9,0 × 2,5 m y tiene el origen en el centro, no en la base. En "Ver en tu espacio" va a aparecer gigante.
Hay que corregir la escala en Blender (o con `gltf-transform`) antes de mostrar el AR.

## Optimizar el modelo

```bash
npx @gltf-transform/cli optimize entrada.glb modelo.glb --compress meshopt --texture-compress webp --texture-size 2048
```

Si el modelo tiene mapa normal (`normalTexture`), la compresión WebP con pérdida lo arruina: aparecen manchas en cuadraditos
sobre superficies lisas. En ese caso comprimí el normal sin pérdida (así se hizo el de prueba):

```bash
npx @gltf-transform/cli optimize entrada.glb t1.glb --compress false --texture-compress false
npx @gltf-transform/cli resize t1.glb t2.glb --width 2048 --height 2048
npx @gltf-transform/cli webp t2.glb t3.glb --slots "{baseColorTexture,metallicRoughnessTexture}"
npx @gltf-transform/cli webp t3.glb modelo.glb --slots "normalTexture" --lossless
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
