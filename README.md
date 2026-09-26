# ProMec web v3

Cambios incluidos:
- Modal inicial con mensaje corporativo.
- Checkbox persistente mediante localStorage (`promec_hide_initial_notice_v1`).
- Firmas: `assets/sign_nelson.png` y `assets/sign_mauricio.png`.
- Botón “Ver presentación” activa fullscreen y avanza a la diapositiva 2.
- En fullscreen de escritorio se muestra `assets/logo_scrolldown.png` al final de cada diapositiva.
- En móvil:
  - slide 1: `assets/logo_swipe_vertical.svg`
  - slides 2–6: `assets/logo_swipe_horizontal.svg`
  - slide 7: `assets/arrow-41.svg`, vuelve al inicio
- Corrección del carrusel móvil para iniciar siempre en la primera tarjeta.
- El swipe vertical ya no interfiere con el swipe horizontal del carrusel.
- Eliminados bordes, fondos y sombras de los contenedores `.media-card`.
- Conservado el sonido de transición con volumen maestro.

## Assets nuevos requeridos
Copia en `assets/`:
- sign_nelson.png
- sign_mauricio.png
- logo_scrolldown.png
- logo_swipe_vertical.svg
- logo_swipe_horizontal.svg
- arrow-41.svg
- favicon.ico (si aún no está)
