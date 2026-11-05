# Perfils electorals

Web para explorar encuestas por `ID2`, con desglose inicial `SEXE` (Home y Dona). Interfaz en catalán, sin dependencias externas. La fuente automática es **`data.csv`**, en la raíz del proyecto, junto a `index.html`.

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

El menú agrupa los indicadores por temas. Busca por etiqueta, descripción o código. Filtra por encuesta, año y perfiles, y cambia el desglose por sexo. El gráfico compara una respuesta; la tabla muestra todas las respuestas y sus recuentos. La exportación CSV incluye los filtros, las bases y el criterio de cálculo.

La tabla presenta los perfiles en columnas por defecto, con un único encabezado por perfil y subcolumnas Home/Dona. En **Personalitza la taula** se puede cambiar a perfiles en filas, agrupar o repetir el título de cada perfil, activar el color por intensidad, mostrar recuentos y mostrar la referencia del conjunto seleccionado. El color usa una escala común de 0 a 100%, sin normalizar por fila. Las bases permanecen visibles. Estas preferencias se guardan en el navegador cuando permite almacenamiento local y se conservan al restablecer filtros; no cambian los cálculos ni el CSV exportado.

En **Preocupacions ciutadanes → Menció problema · tots els problemes**, una tabla reúne todas las columnas `MENCIO_TEMES_` presentes en el CSV. El selector **Resposta a comparar** alterna Sí (1) y No (0). Cada problema conserva su propia base de respuesta por perfil y sexo, visible en cada celda, incluso si se ocultan los recuentos. Las cifras superiores muestran el mínimo y máximo de bases entre indicadores, no una suma de respuestas. Los porcentajes entre problemas no tienen que sumar 100%. Se mantienen filtros y opciones de tabla; esta vista conjunta se ofrece en tabla. Su exportación incluye el conjunto, cada indicador y solo la respuesta elegida.

`Carrega un CSV` sustituye temporalmente los datos en el navegador. Admite UTF-8, separadores punto y coma, coma o tabulación, campos entrecomillados y saltos dentro de campos. Requiere `ID2`, `SEXE`, `estudi`, `ANY` y al menos un indicador conocido. Al recargar, vuelve a leer `data.csv` del servidor, sin caché. Si el archivo falta o es inválido, muestra un aviso; no sustituye silenciosamente los datos por una muestra. Desde `file://`, vuelve a solicitar una selección manual.

## Criterios

- Sin ponderar, según lo acordado. Porcentaje = recuento de una respuesta / respuestas con dato del perfil y sexo seleccionados.
- Vacíos, `NA`, `NaN`, `null` y `No disponible` se excluyen. NS/NC explícitos se pueden excluir; no se descartan códigos numéricos arbitrarios ni otras categorías.
- Los casos sin `ID2` forman `Sense perfil` y se incluyen inicialmente.
- La referencia `Conjunt seleccionat` aplica los mismos filtros. Las bases se muestran siempre; n < 30 se señala de forma orientativa, sin atribuir significación estadística.
- No se mezclan respuestas múltiples en un único porcentaje. Cada columna de mención se trata como un indicador independiente. Para ellas 1 se muestra como mención y 0 como no mención; confirmar esta codificación con el responsable de la base.
- Se conservan etiquetas originales. No se calculan medias de categorías codificadas ni se asume comparabilidad entre encuestas. `PARTIT` combina voto, intención o simpatía según el diccionario y no equivale a intención de voto homogénea.
- El total corresponde al archivo cargado y cuenta registros, no personas únicas verificadas. No constituye por sí solo una estimación electoral. La ausencia de dato no distingue no-respuesta de pregunta no realizada.

## Archivos y cambios

- `catalog.js`: títulos, descripciones, grupos y avisos editables.
- `styles.css`: diseño adaptable a ordenador y móvil.
- `core.js`: lectura de CSV y cálculo de agregados.
- `app.js`: interacción y exportación.
- `table.js`: tablas configurables y conjuntos de indicadores.
- `data-loader.js`: carga automática de `data.csv`, validación y lectura manual.
- `data.csv`: base que añade el responsable manualmente; no incluida en el primer envío.
- `server.cjs`: servidor local sin dependencias.
- `tests/`: pruebas con datos ficticios. Si existe la muestra local no versionada, se ejecutan también comprobaciones opcionales sobre ella.

Los archivos fuente originales y la muestra de desarrollo no se incluyen en el repositorio. `data.csv` no está excluido por `.gitignore`, para permitir la incorporación manual solicitada. Revisar siempre los archivos preparados antes de un commit.

## Pendiente de confirmar

En la muestra inicial faltaban tres variables del Excel (MUNI_VOT, INT_VOT e IDEO_3) y quince columnas no tenían descripción. Se ha asociado explícitamente `at_VAL_instalacions` del diccionario a `cat_VAL_instalacions` de la base. La descripción de `ACCEPTACIO_PROSTITUCIO` parece copiada de especulación inmobiliaria: la interfaz lo advierte sin corregir la fuente. Revisar estas diferencias con la base completa.

Antes de usar la base completa, revisar equivalencia de preguntas, universos y posibles duplicidades entre encuestas, códigos de no-respuesta y las etiquetas provisionales. La prueba de capacidad con 45.000 filas repite la muestra y verifica el cálculo; no sustituye una prueba con la base completa ni mide toda la memoria del navegador.
