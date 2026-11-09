# Perfils electorals

Web para explorar encuestas por perfiles sociodemográficos o variables políticas, con desglose inicial `SEXE` (Home y Dona). Interfaz en catalán, sin dependencias externas. La fuente automática es **`data.csv`**, en la raíz del proyecto, junto a `index.html`.

## Abrir

- Sube tu base al repositorio privado con el nombre exacto `data.csv`, en la raíz. El código se entrega sin observaciones de encuestas.
- Descarga el repositorio o actualiza la copia local con `git pull --ff-only` después de añadir el CSV.
- Abre `perfils-electorals.code-workspace` en VS Code.
- Con Node.js instalado, ejecuta `npm start` en la carpeta y visita http://127.0.0.1:5173. Cargará automáticamente `data.csv`. No requiere `npm install`. Detén el servidor con Ctrl+C.
- También puedes abrir `index.html` con doble clic y seleccionar la base mediante **Carrega un CSV**. Los navegadores no permiten leer automáticamente un archivo vecino al abrir una web con `file://`.
- Comprobaciones: `npm test`.

## Confidencialidad y GitHub

Repositorio: https://github.com/PauBelloPerez/Perfils-Electorals-BCN. Mantenerlo privado y conceder acceso solo a las personas autorizadas. Subir el código a GitHub no crea por sí solo una web accesible por URL.

No se configura GitHub Pages ni un despliegue público. **Un repositorio privado no hace privada una web de GitHub Pages**: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site. Para alojar esta aplicación con datos confidenciales hace falta control de acceso real tanto para la web como para `data.csv`; una contraseña implementada únicamente en JavaScript no protege el archivo.

El servidor incluido escucha solo en `127.0.0.1` y sirve únicamente los archivos de la web y `data.csv`. La carga manual procesa el archivo en el navegador, sin enviarlo a un servidor. La aplicación no incorpora tokens de GitHub, analítica ni servicios externos.

## Uso

El desplegable **Analitza per** elige la variable de referencia de gráficos, tablas y exportaciones: perfiles sociodemográficos (`ID2`, por defecto), distrito (`DISTRICTE`), edad (`EDAT`), sexo (`SEXE`), ideología agrupada (`IDEO_3`), recuerdo de voto municipal (`MUNI_VOT`), intención de voto municipal (`INT_VOT`) o posicionamiento respecto al PSC (`PERFIL_POLITIC`). Las opciones ausentes del archivo aparecen desactivadas. También se pueden consultar las variables políticas como indicadores en el menú temático.

Al cambiar la referencia se seleccionan todas sus categorías y se conservan el indicador y el desglose por sexo. Los porcentajes se calculan dentro de cada categoría y sexo; el conjunto «Menció problema» conserva además la base propia de cada indicador. La exportación identifica la variable de referencia y su descripción. `Restableix` vuelve a `ID2`.

Los datos ausentes de la referencia política (`NA`, vacíos, `No disponible`, etc.) se agrupan como **Sense dada de referència** y se pueden desmarcar en el selector de categorías. En `ID2` se mantiene **Sense perfil**. «No posicionats», «Indecís» y las categorías de abstención son respuestas propias y se conservan, sin confundirlas con valores ausentes. La opción de excluir NS/NC afecta al indicador, no a las categorías de referencia.

En **Desglossament** se puede elegir también **Posicionament respecte al PSC** (`PERFIL_POLITIC`). Cada distrito o categoría de referencia se divide en los posicionamientos presentes en la selección, ordenados según el Excel. Cada cruce tiene su propia base; los casos sin posicionamiento forman **Sense dada de desglossament** y se conservan en el total. Las tablas mantienen un encabezado por categoría y subcolumnas por posicionamiento; los gráficos y el conjunto «Menció problema» utilizan el mismo cruce. La exportación identifica `variable_desglossament`, `desglossament` y `subgrup`; la columna `sexe` indica `Total` en el desglose político. Las opciones de sexo y total siguen disponibles. Si el CSV no tiene una variable, su opción se desactiva.

El menú agrupa los indicadores por temas. Busca por etiqueta, descripción o código. Selecciona las categorías de referencia y el desglose por sexo. Todas las encuestas y todos los años se analizan conjuntamente, sin filtros por origen ni periodo. El gráfico compara una respuesta; la tabla muestra todas las respuestas y sus recuentos. La exportación CSV incluye los filtros, las bases y el criterio de cálculo, e indica «Totes» en encuesta y «Tots» en año. El apartado de origen conserva la cobertura de cada encuesta como información descriptiva.

La tabla presenta los perfiles en columnas por defecto, con un único encabezado por perfil y subcolumnas Home/Dona. En **Personalitza la taula** se puede cambiar a perfiles en filas, agrupar o repetir el título de cada perfil, activar el color por intensidad, mostrar recuentos y mostrar la referencia del conjunto seleccionado. El color usa una escala común de 0 a 100%, sin normalizar por fila. Las bases permanecen visibles. Estas preferencias se guardan en el navegador cuando permite almacenamiento local y se conservan al restablecer filtros; no cambian los cálculos ni el CSV exportado.

En **Preocupacions ciutadanes → Menció problema · tots els problemes**, una tabla reúne todas las columnas `MENCIO_TEMES_` presentes en el CSV. El selector **Resposta que es mostra** alterna Sí (1) y No (0). Cada problema conserva su propia base de respuesta por perfil y sexo, visible en cada celda, incluso si se ocultan los recuentos. Las cifras superiores muestran el mínimo y máximo de bases entre indicadores, no una suma de respuestas. Los porcentajes entre problemas no tienen que sumar 100%. Se mantienen filtros y opciones de tabla; esta vista conjunta se ofrece en tabla. Su exportación incluye el conjunto, cada indicador y solo la respuesta elegida.

`Carrega un CSV` sustituye temporalmente los datos en el navegador. Admite UTF-8, separadores punto y coma, coma o tabulación, campos entrecomillados y saltos dentro de campos. Requiere `ID2`, `SEXE`, `estudi`, `ANY` y al menos un indicador conocido. Al recargar, vuelve a leer `data.csv` del servidor, sin caché. Si el archivo falta o es inválido, muestra un aviso; no sustituye silenciosamente los datos por una muestra. Desde `file://`, vuelve a solicitar una selección manual.

## Exportar la tabla con formato

En **Exporta taula** hay cuatro opciones. Todas usan la selección actual:

- **Excel amb format (.xlsx)** genera un libro con la disposición visible, encabezados combinados, colores, bases y recuentos según las opciones activadas. Los porcentajes sin texto adicional se guardan como valores numéricos; las celdas con recuentos o bases en varias líneas conservan ese texto tal como aparece en pantalla. Los encabezados quedan inmovilizados. No necesita Excel instalado ni conexión externa.
- **Copia la taula amb format** copia HTML y texto tabulado para pegar en Excel, Word o documentos compatibles. El formato final depende de la aplicación de destino. Intenta primero la API de portapapeles y, si no está disponible o rechaza la escritura, la copia de una selección con formato. Si ambas fallan, abre la tabla seleccionada para copiar con Ctrl+C (⌘C en Mac), sin pedir cambios de permisos. La alternativa manual solo aparece si fallan los dos intentos automáticos; no ocupa una opción adicional en el menú. No muestra un mensaje de éxito cuando la copia automática falla.
- **Imprimeix / Desa com a PDF** abre una vista previa. El botón de impresión permite elegir «Guardar como PDF» en el navegador. Usa A4 horizontal, divide las tablas anchas por bloques y repite las etiquetas y columnas de referencia o base para mantenerlas legibles. Los encabezados se repiten en los saltos verticales. Incluye título, selección, criterio y leyenda de bases pequeñas.
- **Dades en CSV** conserva la descarga de datos detallados para otros análisis.

Se exporta la tabla completa, incluidas las filas y columnas fuera del área desplazable; desde la vista de gráfico se utiliza la tabla correspondiente. Los porcentajes no se recalculan al exportar. Sin respuestas válidas, las acciones se desactivan.

## Criterios

- Sin ponderar, según lo acordado. Porcentaje = recuento de una respuesta / respuestas con dato del perfil y sexo seleccionados.
- Vacíos, `NA`, `NaN`, `null` y `No disponible` se excluyen. NS/NC explícitos se pueden excluir; no se descartan códigos numéricos arbitrarios ni otras categorías.
- Los casos sin `ID2` forman `Sense perfil` y se incluyen inicialmente.
- La referencia `Conjunt seleccionat` aplica los mismos filtros. Las bases se muestran siempre; n < 30 se señala de forma orientativa, sin atribuir significación estadística.
- No se mezclan respuestas múltiples en un único porcentaje. Cada columna de mención se trata como un indicador independiente. Para ellas 1 se muestra como mención y 0 como no mención; confirmar esta codificación con el responsable de la base.
- Se conservan etiquetas originales. No se calculan medias de categorías codificadas ni se asume comparabilidad entre encuestas. `PARTIT` combina voto, intención o simpatía según el diccionario y no equivale a intención de voto homogénea.
- El total corresponde al archivo cargado y cuenta registros, no personas únicas verificadas. No constituye por sí solo una estimación electoral. La ausencia de dato no distingue no-respuesta de pregunta no realizada.

## Archivos y cambios

- `catalog.js`: títulos cortos, grupos, avisos y descripciones de respaldo.
- `metadata/respostes_variables_ordre.xlsx`: diccionario original de variables, descripciones, respuestas y orden.
- `response-metadata.js`: diccionario generado para el navegador; se distribuye junto con la web.
- `scripts/import_response_metadata.py`: importador del Excel, con Python y sin dependencias externas.
- `styles.css`: diseño adaptable a ordenador y móvil.
- `core.js`: lectura de CSV y cálculo de agregados.
- `app.js`: interacción y exportación.
- `table.js`: tablas configurables y conjuntos de indicadores.
- `table-export.js`: captura de la tabla, copia con formato, vista de impresión y exportación XLSX sin dependencias.
- `data-loader.js`: carga automática de `data.csv`, validación y lectura manual.
- `data.csv`: base que añade el responsable manualmente; no incluida en el primer envío.
- `server.cjs`: servidor local sin dependencias.
- `tests/`: pruebas con datos ficticios. Si existe la muestra local no versionada, se ejecutan también comprobaciones opcionales sobre ella.

La muestra de desarrollo no se incluye en el repositorio. `data.csv` no está excluido por `.gitignore`. Revisar siempre los archivos preparados antes de un commit.

## Diccionario de respuestas y orden

El Excel de `metadata/` contiene las columnas `VARIABLE`, `DESCRIPCIÓ`, `RESPOSTA` y `ORDRE`. No hace falta convertirlo a CSV. La web usa sus descripciones y ordena las respuestas por `ORDRE` numérico ascendente en tablas, selectores y exportaciones. También aplica ese orden a las categorías de referencia y al desglose por sexo (Dona, Home en el diccionario actual). Al entrar en un indicador se selecciona su primera respuesta disponible en ese orden. Los títulos cortos y los grupos temáticos se mantienen en `catalog.js`.

Solo aparecen las respuestas presentes en la selección, como hasta ahora. Los valores ausentes siguen excluidos de las bases del indicador; los grupos «Sense perfil» y «Sense dada de referència» ocupan la posición de los valores ausentes del diccionario. Si una base futura introduce categorías no recogidas, se conservan y aparecen al final, ordenadas alfabéticamente. `ORDRE` ordena respuestas dentro de cada variable, no indicadores entre sí.

Para actualizar el diccionario, sustituye el Excel en `metadata/` y ejecuta desde la carpeta del proyecto:

```powershell
python scripts/import_response_metadata.py
npm test
```

El importador valida columnas, descripciones coherentes, respuestas únicas y órdenes numéricos sin duplicados. Genera `response-metadata.js` sin modificar el Excel ni `data.csv`. Para publicar la actualización debe incluirse también ese archivo generado. El diccionario actual cubre las 183 columnas y todas las respuestas observadas de la base completa; las pruebas vuelven a comprobarlo si existe `data.csv`.

## Pendiente de confirmar

La descripción de `ACCEPTACIO_PROSTITUCIO` sigue pareciendo copiada de especulación inmobiliaria en el nuevo diccionario: la interfaz conserva el aviso sin corregir la fuente.

Antes de usar la base completa, revisar equivalencia de preguntas, universos y posibles duplicidades entre encuestas, códigos de no-respuesta y las etiquetas provisionales. La prueba de capacidad con 45.000 filas repite la muestra y verifica el cálculo; no sustituye una prueba con la base completa ni mide toda la memoria del navegador.

El desplegable **Desglossament** también ofrece **Edat** (`EDAT`), con los seis tramos del diccionario en su orden. Los casos sin edad forman «Sense dada de desglossament». Cada cruce conserva su propia base en gráficos, tablas, conjuntos y exportaciones.
