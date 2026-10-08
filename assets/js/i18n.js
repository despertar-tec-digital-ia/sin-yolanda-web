/* ============================================================
   SIN YOLANDA® — i18n EN/ES (sección 07 del Manual v1)
   REGLA: "No traducimos. Adaptamos."
   - NUNCA se traducen: Sin Yolanda, Vámonos recio, Sin miedo al
     éxito, El dicho, Cucaracho, Cantina, nombres de platillos,
     cocteles y paquetes.
   - Sí van en EN: info operativa (horarios, reservas, dirección)
     y CTAs de conversión (Book a table).
   - El toggle vive en localStorage ("sy-lang"). ES por defecto.
   ============================================================ */
(function () {
  const DICT = {
    /* ---------- HEADER / NAV ---------- */
    "Inicio": "Home",
    "La Cantina": "The Cantina",
    "Catering": "Catering",
    "Ubicaciones": "Locations",
    "Eventos": "Private Events",
    "Panel": "Hub",
    "Sin Yolanda, inicio": "Sin Yolanda, home",

    /* ---------- FOOTER ---------- */
    "Una marca que vive en cada ciudad: Guadalajara y Texas.": "One brand that lives in every city: Guadalajara and Texas.",
    "Sucursales abiertas": "Open locations",
    "Próximamente": "Coming soon",
    "Reservaciones": "Reservations",
    "OpenTable en Texas · WhatsApp en Guadalajara.": "OpenTable in Texas · WhatsApp in Guadalajara.",
    "Digital Hub · Panel interno": "Digital Hub · Internal dashboard",
    "Explora": "Explore",

    /* ---------- HERO HOME ---------- */
    "Aquí se canta.": "This is where you sing.",
    "Ocho destinos.": "Eight destinations.",
    "Explorar ubicaciones": "See locations",
    "Reservar": "Book a table",
    "Elige tu próxima noche.": "Pick your next night.",
    "Elige tu próxima noche. La mesa ya está puesta.": "Pick your next night. The table is already set.",

    /* ---------- FILTROS UBICACIONES ---------- */
    "Todas": "All",
    "México": "Mexico",
    "Estados Unidos": "United States",
    "Filtrar ubicaciones": "Filter locations",
    "Cuál te queda": "Find your cantina",
    "México y Estados Unidos": "Mexico and United States",
    "Jalisco, México": "Jalisco, Mexico",
    "Zona Chapalita, Zapopan": "Chapalita area, Zapopan",
    "Abre el 9 de octubre": "Opens October 9",
    "Abre": "Opens",
    "Ruleta de shots y bebidas sobre una mesa de Sin Yolanda": "A shot roulette and drinks on a Sin Yolanda table",
    "Elige tu sucursal": "Choose your location",

    /* ---------- TARJETAS / CTAS ---------- */
    "Ver sucursal": "View location",
    "Cómo llegar": "Directions",
    "Seguir la apertura": "Follow the opening",
    "Recibir novedades": "Get updates",
    "Próxima apertura": "Opening soon",
    "9 de octubre": "October 9",
    "Conoce la sucursal": "View location",
    "Reservar evento": "Book an event",

    /* ---------- SECCIONES HOME ---------- */
    "Gastronomía mexicana contemporánea": "Contemporary Mexican kitchen",
    "Música y participación social": "Music and crowd participation",
    "Celebraciones con intención": "Celebrations with a reason",
    "Hospitalidad local, visión corporativa": "Local hospitality, big-picture thinking",
    "Momentos para compartir.": "Moments made to share.",
    "Una noche que se recuerda.": "A night you remember.",
    "La casa por dentro": "Inside the house",
    "Cocina de cantina contemporánea, bar de agave y el micrófono abierto. Todo en la misma mesa.": "Contemporary cantina kitchen, an agave bar, and the open mic. All at the same table.",
    "Menú de muestra": "Menu preview",
    "Se botanea en serio.": "We snack the serious way.",
    "Reseñas destacadas": "Top reviews",
    "Reseñas reales de la banda.": "Real reviews from the crew.",
    "Elige ubicación. Nosotros hacemos el resto.": "Pick a location. We handle the rest.",
    "Reserva por el canal oficial de tu sucursal: OpenTable en Texas y WhatsApp en Guadalajara.": "Book through your location's official channel: OpenTable in Texas, WhatsApp in Guadalajara.",
    "Elegir ubicación": "Choose a location",
    "Elegir sucursal": "Choose a location",
    "Se aceptan pretextos chiquitos.": "Every little excuse counts.",
    "Quincena": "Payday",
    "Renuncia": "Quitting day",
    "Divorcio": "Divorce",
    "Viernes": "Friday",
    "Porque sí": "Just because",
    "“Aquí se entera todo el lugar.”": "“The whole cantina will hear about it.”",
    "“Cayó. Eso cuenta.”": "“Payday landed. That counts.”",
    "“Mañana vemos qué sigue. Hoy se arma.”": "“Tomorrow is tomorrow. Tonight is tonight.”",
    "“¿Ya firmaste? Pues eso se festeja.”": "“Signed the papers? That's worth a celebration.”",
    "“¿Neta necesitas más pretexto?”": "“Do you really need another excuse?”",
    "“El mejor de todos.”": "“The best reason of all.”",
    "La cartelera de tu cantina.": "What's on at your cantina.",
    "Los eventos y las promociones cambian por sucursal. Consulta lo más reciente en su Instagram.": "Events and promotions vary by location. Check its Instagram for the latest.",
    "Agendas en Instagram": "What's on, on Instagram",
    "Eventos y promociones": "Events and promotions",
    "Consulta la programación de esta sucursal en su Instagram.": "Check this location's Instagram for its latest events and promotions.",
    "Ver agenda en Instagram": "See what's on, on Instagram",
    "¿Cumpleaños?": "Birthday plans?",
    "Tu gente, una mesa y un buen pretexto. Elige tu sucursal y consulta disponibilidad para celebrar.": "Your people, a table and a good excuse. Choose your location and check availability for your celebration.",

    /* ---------- MODAL ---------- */
    "Recibir novedades de la apertura": "Get opening updates",
    "Tu correo": "Your email",
    "Website": "Website",
    "Avísame antes que a nadie": "Tell me first",
    "Enviar solicitud": "Send request",
    "Tu correo electrónico quedó registrado.": "Your email is on the list.",

    /* ---------- LOCATIONS ---------- */
    "Encuentra tu Sin Yolanda.": "Find your Sin Yolanda.",
    "México y Estados Unidos conectados bajo una estructura clara, local y escalable.": "Mexico and the U.S. connected under one clear, local, scalable setup.",
    "Abiertas": "Open",
    "Con catering": "With catering",
    "Todas las casas": "All locations",
    "ABIERTO": "OPEN",
    "PRÓXIMAMENTE": "COMING SOON",

    /* ---------- CATERING ---------- */
    "SIN YOLANDA® CATERING · ESTADOS UNIDOS": "SIN YOLANDA® CATERING · UNITED STATES",
    "Llevamos el micrófono a tu fiesta": "We bring the mic to your party",
    "Cocina, barra y karaoke en Texas y California. La cantina completa, montada donde tú digas.": "Kitchen, bar, and karaoke in Texas and California. The full cantina, set up wherever you say.",
    "Arma tu fiesta": "Build your party",
    "Ver ubicaciones": "See locations",
    "Se arma por piezas": "Book it by the piece",
    "Contrata uno, dos o los tres.": "Hire one, two, or all three.",
    "La Cocina": "The Kitchen",
    "Taquiza, cortes, mariscos y botanas. Cocinado en sitio.": "Taco spreads, steaks, seafood, and snacks. Cooked on site.",
    "La Barra": "The Bar",
    "Barra móvil, cantineros, tequila y mezcal, cócteles de la casa.": "Mobile bar, bartenders, tequila and mezcal, house cocktails.",
    "El Micrófono": "The Mic",
    "Sonido, karaoke y un anfitrión que hace cantar a tu gente.": "Sound, karaoke, and a host who gets your people singing.",
    "Bodas": "Weddings",
    "Quinceañeras": "Quinceañeras",
    "Graduaciones": "Graduations",
    "Corporativos": "Corporate",
    "Cumpleaños": "Birthdays",
    "Fiestas en casa": "House parties",
    "Cinco pasos, cero dramas.": "Five steps. Zero drama.",
    "Nos cuentas tu fiesta": "You tell us about the party",
    "Te cotizamos": "We send a quote",
    "Afinamos el menú": "We tune the menu",
    "Llegamos y armamos": "We show up and set up",
    "Tu gente canta": "Your people sing",
    "Cobertura · Estados Unidos": "Coverage · United States",
    "Salimos a carretera.": "We hit the road.",
    "¿Tu ciudad no aparece? Escríbenos.": "City not listed? Write to us.",
    "Llamar al catering": "Call catering",
    "Ya disponible": "Available now",

    /* ---------- LA CANTINA ---------- */
    "La cantina": "The cantina",
    "Como una boda mexicana, todas las noches": "Like a Mexican wedding, every single night",
    "Mesas largas, gente que no se conocía y a las dos de la mañana se abraza cantando. Eso es la casa.": "Long tables, strangers who by 2 a.m. are hugging and singing. That's the house.",
    "La barra": "The bar",
    "Más de 30 marcas de agave.": "30+ agave brands.",
    "Cócteles de la casa": "House cocktails",
    "La cocina": "The kitchen",
    "Todo para el centro de la mesa.": "Everything for the center of the table.",
    "Botanas · Tacos": "Snacks · Tacos",
    "Cortes · Mariscos": "Steaks · Seafood",
    "La carta completa": "The full menu",
    "Se comparte en cada sucursal.": "Shared at every location.",
    "Se comparte o no se pide.": "Share it or don't order it.",

    /* ---------- EVENTOS ---------- */
    "Eventos en la cantina": "Events at the cantina",
    "Privatiza la cantina": "Buy out the cantina",
    "Cierra la casa para los tuyos. Cocina, barra y micrófono, sin nadie más adentro.": "Close the house for your people. Kitchen, bar, and mic — nobody else inside.",
    "Tres formas de hacerlo": "Three ways to do it",
    "Elige el motivo.": "Pick the reason.",
    "Cumpleaños": "Birthdays",
    "Mesa larga, pastel y una canción que nadie te va a dejar cantar solo.": "A long table, cake, and one song nobody lets you sing alone.",
    "Despedidas": "Send-offs",
    "Soltera, soltero o de trabajo. Aquí se despide cantando.": "Bachelorette, bachelor, or work. You sing your way out.",
    "Fin de año, cierre de trimestre o el equipo entero. El micrófono rompe el hielo.": "Year-end, quarter close, or the whole team. The mic breaks the ice.",
    "Cuéntanos de tu evento": "Tell us about your event",
    "Te pasa directo con la sucursal.": "We connect you straight to the location.",
    "WhatsApp Guadalajara": "WhatsApp Guadalajara",
    "Sucursales en Texas": "Texas locations",
    "¿Prefieres que vayamos nosotros?": "Rather we come to you?",
    "Conoce Sin Yolanda Catering.": "Meet Sin Yolanda Catering.",

    /* ---------- EL PASO ---------- */
    "El Paso, Texas": "El Paso, Texas",
    "El Chuco ya trae el plan": "El Chuco already has the plan",
    "La cantina va en camino y el catering ya está listo.": "The cantina is on the way and catering is ready now.",
    "Catering en El Paso": "Catering in El Paso",
    "Avísame cuando abra": "Tell me when it opens",
    "Ya operando": "Already running",
    "Tu fiesta, con micrófono, desde hoy.": "Your party, with a mic, starting today.",
    "Nuestro catering mexicano ya trabaja en El Paso y alrededores: cocina en sitio, barra completa y micrófono abierto.": "Our Mexican catering already works El Paso and around: on-site kitchen, full bar, open mic.",
    "Cocinamos en sitio": "We cook on site",
    "Taquiza, cortes, mariscos y botanas montadas en tu casa o salón.": "Taco spreads, steaks, seafood, and snacks set up at your house or venue.",
    "Barra completa": "Full bar",
    "Tequila, mezcal y cócteles de la casa con cantineros.": "Tequila, mezcal, and house cocktails with bartenders.",
    "Estamos por abrir en El Paso.": "We're about to open in El Paso.",
    "Seguir @sinyolandaelpaso": "Follow @sinyolandaelpaso",
    "La ruta": "The route",
    "De Guadalajara a El Paso.": "From Guadalajara to El Paso.",
    "Nos vemos pronto, El Paso": "See you soon, El Paso",
    "El catering no espera.": "Catering doesn't wait.",

    /* ---------- TIENDA ---------- */
    "Tienda": "Shop",
    "Para llevarte la casa puesta": "Take the house with you",
    "Venta en línea muy pronto. Mientras tanto, todo se compra en la barra, mirando a los ojos.": "Online shop coming soon. Until then, everything is bought at the bar, eye to eye.",
    "Disponible en la cantina": "Available at the cantina",
    "Lo de siempre, puesto.": "The usual, done right.",

    /* ---------- SUCURSALES (labels) ---------- */
    "Cómo llegar y dónde estacionarte": "Directions & parking",
    "Horarios": "Hours",
    "Reserva en OpenTable": "Book on OpenTable",
    "Reserva por WhatsApp": "Book on WhatsApp",
    "Ver menú": "See menu",
    "Síguenos": "Follow us",
    "Menú de la casa": "House menu",

    /* ---------- OTROS ---------- */
    "Ver más": "See more",
    "Ver menos": "See less",
    "LEER MÁS": "READ MORE",
    "READ MORE": "READ MORE",
    "LEER MENOS": "READ LESS",
    "Cerrado": "Closed",
    "Abierto": "Open",
    "Habitual": "Regular",
    "Novedoso": "New",
    "Cada página organiza información, reservaciones y descubrimiento local sin perder la identidad de la marca.": "Each page organizes information, reservations, and local discovery without losing the brand identity.",
    "Cada casa tiene su propia mesa, y todas suenan igual cuando se prende el micrófono.": "Every house has its own table, and they all sound the same once the mic goes up.",
    "Tu próxima historia comienza aquí": "Your next story starts here",
    "Elige ubicación.Nosotros hacemos el resto.": "Pick a location. We handle the rest.",
    "sucursales abiertas": "open locations",
    "próxima apertura": "next opening",
    "próximas aperturas": "openings coming up",
    "Menú": "Menu",
    "México · Estados Unidos": "Mexico · United States",
    "Cantina · Karaoke · Coctelería": "Cantina · Karaoke · Cocktails",
    "Mexican restaurant · En preparación": "Mexican restaurant · In the works",
    "Noche de canto": "Sing night",
    "Jue–Sáb · desde las 8:00 pm": "Thu–Sat · from 8:00 pm",
    "El micrófono recorre las mesas y la cantina entera se vuelve coro. Disponibilidad sujeta a cada sucursal.": "The mic travels the tables and the whole cantina becomes a choir. Subject to availability per location.",
    "Reservación para grupos": "Group reservations",
    "Cumpleaños, aniversarios y quince años con menú y mesa reservada. Coordina con la sucursal.": "Birthdays, anniversaries, and quinceañeras with a set menu and reserved table. Coordinate with the location.",
    "Déjanos tu correo y te avisamos cuando abramos en El Paso. Mientras tanto, sigue @sinyolandaelpaso en Instagram.": "Leave your email and we'll tell you when El Paso opens. Meanwhile, follow @sinyolandaelpaso on Instagram.",
    "Elige ubicación.": "Pick a location.",
    "Nosotros hacemos el resto.": "We handle the rest.",
    "Celebraciones": "Celebrations",
    "Brunch de domingo": "Sunday brunch",
    "Aviso de privacidad": "Privacy notice",
    "Una noche que se recuerda.": "A night you remember.",
    "El Micrófono": "The Mic",
    "El micrófono": "The Mic",
    "Sonido, karaoke y un anfitrión que hace cantar a tu gente.": "Sound, karaoke, and a host who gets your people singing.",
    "Estamos por abrir en El Paso.": "We're about to open in El Paso.",
    "Sin Yolanda es una cantina de micrófono abierto nacida en Guadalajara: tequila, canciones que todos se saben y noches que se recuerdan. La próxima mesa larga será en 340 Vin Rambla Dr.": "Sin Yolanda is an open-mic cantina born in Guadalajara: tequila, songs everyone knows, and nights worth remembering. The next long table lands at 340 Vin Rambla Dr.",
    "De Guadalajara a El Paso.": "From Guadalajara to El Paso.",
    "La ruta": "The route",
    "Próxima parada · El Chuco": "Next stop · El Chuco",
    "2023 · La casa original": "2023 · The original house",
    "2025 · El River Walk": "2025 · The River Walk",
    "2026 · Washington Ave": "2026 · Washington Ave",
    "2026 · El norte": "2026 · The north",
    "Guadalajara": "Guadalajara",
    "Jardines de San Ignacio, Zapopan": "Jardines de San Ignacio, Zapopan",
    "¿Tu ciudad no aparece? Escríbenos.": "City not listed? Write to us.",
    "Houston": "Houston",
    "Washington Ave": "Washington Ave",
    "Shenandoah": "Shenandoah",
    "River Walk": "River Walk",
    "Ya disponible": "Available now",
    "Moreno Valley": "Moreno Valley",
    "San Diego": "San Diego",
    "Próximamente": "Coming soon",
    "Cinco pasos, cero dramas.": "Five steps. Zero drama.",

    /* ---------- RONDA 7: páginas de sucursal + agenda + legal ---------- */
    "Inicio": "Home",
    "Ruta": "Path",
    "Información práctica": "Good to know",
    "Todo lo necesario antes de llegar.": "Everything you need before you arrive.",
    "NAP verificado contra Google Business Profile el 24 de septiembre de 2026.": "NAP verified against Google Business Profile on September 24, 2026.",
    "Dirección": "Address",
    "Horarios": "Hours",
    "Teléfono": "Phone",
    "Teléfono:": "Phone:",
    "Canal oficial de reservación": "The official booking channel",
    "Canal oficial de la sucursal": "The location's official channel",
    "El boletín por correo se activará con la conexión del sistema.": "The email newsletter will switch on once the system is connected.",
    "Dirección:": "Address:",
    "Horarios:": "Hours:",
    "Reseña de Google · julio 2026": "Google review · July 2026",
    "Estacionamiento": "Parking",
    "Accesibilidad": "Accessibility",
    "Reservaciones": "Reservations",
    "Perfil verificado en Google": "Google-verified profile",
    "Reservar en OpenTable": "Book on OpenTable",
    "Llamar a la sucursal": "Call the location",
    "Las reservaciones se confirman por el canal oficial de la sucursal dentro del horario de operación.": "Reservations are confirmed by the location's official channel during operating hours.",
    "Canal oficial": "Official channel",
    "Confirmación del equipo": "Team confirmation",
    "Grupos y celebraciones": "Groups & celebrations",
    "Reserva tu mesa por el canal oficial de la sucursal o llámanos directamente. El equipo confirma disponibilidad durante el horario de operación.": "Book your table through the location's official channel or call us directly. The team confirms availability during operating hours.",
    "Reservaciones": "Reservations",
    "Reservar en": "Book at",
    "Activo": "Active",
    "Menú de muestra": "Menu preview",
    "Una selección breve para demostrar cómo el menú puede adaptarse por ciudad, idioma y disponibilidad.": "A short selection showing how the menu adapts by city, language, and availability.",
    "Coctelería de autor": "Signature cocktails",
    "Entradas para compartir": "Sharing plates",
    "Cocina mexicana": "Mexican kitchen",
    "Brunch seleccionado": "Brunch picks",
    "Ver menú": "See menu",
    "Una agenda propia.": "Its own calendar.",
    "Programación de ejemplo para mostrar el flujo de comunicación y reservación.": "Sample programming showing how booking and communication flow.",
    "Reservar evento": "Book an event",
    "Reservar": "Book a table",
    "Galería": "Gallery",
    "La atmósfera habla primero.": "The atmosphere speaks first.",
    "Consistencia en cada búsqueda.": "Consistent on every search.",
    "Directorios preparados": "Listings ready",
    "Verificado": "Verified",
    "En proceso": "In progress",
    "Respuesta de propietario": "Owner response",
    "Gracias por compartir tu experiencia. Esperamos recibirte nuevamente muy pronto.": "Thanks for sharing your experience. We look forward to hosting you again soon.",
    "Preguntas frecuentes": "FAQ",
    "Antes de reservar.": "Before you book.",
    "¿Cómo reservar?": "How do I book?",
    "¿Aceptan grupos?": "Do you take groups?",
    "¿Dónde estacionarse?": "Where do I park?",
    "¿Los horarios cambian durante eventos?": "Do hours change during events?",
    "¿Cómo confirmar una reservación?": "How do I confirm a reservation?",
    "El equipo de la sucursal confirma detalles de grupos, estacionamiento y eventos al reservar por WhatsApp, teléfono u OpenTable.": "The location team confirms group, parking, and event details when you book via WhatsApp, phone, or OpenTable.",
    "Cada sucursal administra su agenda; confirma disponibilidad al reservar.": "Each location runs its own calendar; confirm availability when booking.",
    "Disponible en las sucursales de Texas con horario diurno. Sujeto a disponibilidad local.": "Available at Texas locations with daytime hours. Subject to local availability.",
    "Aviso de privacidad": "Privacy notice",
    "Ver reseñas en Google Maps": "See reviews on Google Maps",
    "Llamar": "Call",
    "Calificación": "Rated",
    "reseñas en Google.": "reviews on Google.",

    /* horarios y datos dinámicos (mock-data) */
    "Mié–Sáb · 7:00 pm–3:00 am": "Wed–Sat · 7:00 pm–3:00 am",
    "Vie–Sáb · 7:00 pm–3:00 am": "Fri–Sat · 7:00 pm–3:00 am",
    "Mié y Dom · 12:00 pm–9:00 pm · Jue–Sáb · 12:00 pm–2:00 am": "Wed & Sun · 12:00 pm–9:00 pm · Thu–Sat · 12:00 pm–2:00 am",
    "Mié · 4:00–9:00 pm · Jue–Vie · 4:00 pm–12:00 am · Sáb · 12:00 pm–12:00 am · Dom · 10:00 am–9:00 pm": "Wed · 4:00–9:00 pm · Thu–Fri · 4:00 pm–12:00 am · Sat · 12:00 pm–12:00 am · Sun · 10:00 am–9:00 pm",
    "Horario por confirmar en la apertura": "Hours to be confirmed at opening",
    "Valet parking y estacionamiento en la zona": "Valet and area parking",
    "Lote propio gratuito, calle y garage de pago": "Free own lot, street, and paid garages",
    "Lote gratuito, calle, garage y valet": "Free lot, street, garage, and valet",
    "Lote gratuito, calle, lote de pago y valet": "Free lot, street, paid lot, and valet",
    "Información por confirmar": "Info to be confirmed",
    "Información pendiente de validación": "Info pending validation",
    "Entrada, mesas, estacionamiento y baño accesibles": "Accessible entrance, tables, parking, and restroom",
    "Entrada, mesas y baño accesibles": "Accessible entrance, tables, and restroom",
    "Abierta": "Open",
    "Dom · 12:00 pm": "Sun · 12:00 pm",

    /* ---------- REDISEÑO "EL PLAN" ---------- */
    "Ya quedó. Aquí se festeja.": "Done crying. This is where we celebrate.",
    "Cantina contemporánea, comida que sí llena, tragos coquetos y canciones que te sabes completas.": "Contemporary cantina, food that actually fills you up, pretty drinks, and songs you know by heart.",
    "Reservar mesa": "Book a table",
    "Ver el plan": "See the plan",
    "El plan ya está armado.": "The plan is already set.",
    "Tú solo trae el pretexto.": "Just bring the excuse.",
    "Se aceptan pretextos chiquitos.": "We accept tiny excuses.",
    "Aquí se entera todo el lugar.": "The whole place finds out.",
    "Cayó. Eso cuenta.": "Payday hit. That counts.",
    "Mañana vemos qué sigue. Hoy se arma.": "Tomorrow we figure out what's next. Tonight we party.",
    "¿Ya firmaste? Pues eso se festeja.": "Signed the papers? That's a celebration.",
    "¿Neta necesitas más pretexto?": "Seriously, you need a better excuse?",
    "El mejor de todos.": "The best one of all.",
    "Cuéntanos y apartamos mesa": "Tell us and we'll hold a table",
    "Esta semana se puso bueno.": "This week just got good.",
    "Los eventos de cada casa, aquí apenas se están armando.": "Each location's events are being lined up right here.",
    "Trae a los cuatro.": "Bring the four.",
    "Mesas largas, brinde completo y el micrófono que no se le niega a nadie. Aquí no hay mesa reservada para influencers: la mejor foto la hace tu gente.": "Long tables, full toasts, and a mic nobody is denied. No influencer-reserved tables here: your people take the best photos.",
    "Comida + tragos": "Food + drinks",
    "Tragos coquetos y comida que sí llena.": "Pretty drinks and food that actually fills you up.",
    "Para botanear": "For snacking",
    "Guacamole con chicharrón, queso fundido y quesabirria con consomé. El centro de la mesa se comparte.": "Guac with chicharrón, melted cheese, and quesabirria with consomé. The center of the table is shared.",
    "Para echarse una": "For a round",
    "Paloma de la casa, carajillo y más de 30 marcas de agave. Pregunta: aquí te contamos.": "House paloma, carajillo, and 30+ agave brands. Ask away — we'll tell you all about them.",
    "Para cantar": "For singing",
    "El micrófono pasa por las mesas. La canción la eliges tú y el coro lo pone el lugar.": "The mic makes the rounds. You pick the song; the room brings the chorus.",
    "Ver la carta": "See the menu",
    "Celebraciones": "Celebrations",
    "¿Cumpleaños?": "Birthday?",
    "Aquí se entera todo el lugar. Avísanos y ya sabemos qué hacer: mesa larga, pastel y una canción que nadie te va a dejar cantar solo.": "The whole place finds out. Let us know and we know exactly what to do: a long table, cake, and one song nobody lets you sing alone.",
    "Armar mi cumpleaños": "Plan my birthday",
    "Ver sucursales": "See locations",
    "Ubicaciones": "Locations",
    "¿Cuál te queda?": "Which one works for you?",
    "¿Sin Yolanda? Si sabes, sabes.": "Sin Yolanda? If you know, you know.",
    "Ya quedó.": "Say when.",
    "El plan": "The plan",
    "Los pretextos": "The excuses",
    "Cartelera": "Lineup",
    "Comida": "Food",
    "Tragos": "Drinks",
    "Música": "Music",
    "Micrófono": "The Mic",
    "La banda": "The crew",
    "Para el centro de la mesa. Se comparte o no se pide.": "For the center of the table. Share it or don't order it.",
    "Coquetos. Sin lista de precios: pregunta y te contamos.": "Pretty. No price list: just ask, we'll tell you.",
    "Canciones que te sabes completas.": "Songs you know by heart.",
    "Pasa por las mesas. Nadie se lo niega a nadie.": "It makes the rounds. Nobody gets denied.",
    "Trae a los cuatro. Aquí caben todos.": "Bring the four. Everyone fits here.",
    "Cumpleaños, renuncias, quincenas. Cualquier pretexto.": "Birthdays, quitting, payday. Any excuse.",
    "La casa por dentro": "Inside the house"
  };

  const WORD_SWAP = [
    [/(\bMéxico\b)/g, "Mexico"],
    [/\bEE\.UU\.\b/g, "USA"],
    [/\bJalisco\b/g, "Jalisco"],
  ];
  const LANG_KEY = "sy-lang";
  const TRANSLATABLE_SELECTOR = "h1, h2, h3, h4, h5, h6, p, a, span, strong, em, li, blockquote, dt, dd, option, small, button:not([aria-label]), label, figcaption, summary, .opening-announcement time";

  let current = "es";

  function norm(s) {
    return s.replace(/\s+/g, " ").trim();
  }

  function wordSwap(s) {
    if (!/México|EE\.UU\./.test(s)) return null;
    return s.replace(/\bMéxico\b/g, "Mexico").replace(/\bEE\.UU\./g, "USA");
  }

  const PREFIX_SWAPS = [
    [/^Reservar en (.+)$/, "Book at $1"],
    [/^Reservaciones en (.+)$/, "Reservations at $1"],
    [/^Llamar a (.+)$/, "Call $1"],
  ];

  function apply(lang) {
    current = lang;
    document.documentElement.lang = lang === "en" ? "en" : "es";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}

    document.querySelectorAll(TRANSLATABLE_SELECTOR).forEach((node) => {
      // traducir cada nodo de texto directo (funciona con <br/>, <span>, etc.)
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType !== 3) return;
        const s = norm(n.textContent);
        if (!s || !/[a-záéíóúñ]/i.test(s)) return;
        if (lang === "en") {
          if (n._syEs === undefined) n._syEs = s;
          let rep = null;
          for (const [re, tpl] of PREFIX_SWAPS) {
            const m = s.match(re);
            if (m) { rep = tpl.replace("$1", m[1]); break; }
          }
          if (!rep) rep = DICT[s] || wordSwap(s);
          if (rep && rep !== s) n.textContent = rep;
        } else if (n._syEs !== undefined) {
          n.textContent = n._syEs;
          delete n._syEs;
        }
      });
    });

    document.querySelectorAll("[aria-label], img[alt]").forEach((el) => {
      for (const attribute of ["aria-label", "alt"]) {
        const a = el.getAttribute(attribute);
        if (!a) continue;
        const cacheKey = attribute === "alt" ? "_syAlt" : "_syA";
        if (lang === "en") {
          if (el[cacheKey] === undefined) el[cacheKey] = a;
          let rep = null;
          for (const [re, tpl] of PREFIX_SWAPS) {
            const m = a.match(re);
            if (m) { rep = tpl.replace("$1", m[1]); break; }
          }
          if (!rep) rep = DICT[norm(a)] || wordSwap(a);
          if (rep && rep !== a) el.setAttribute(attribute, rep);
        } else if (el[cacheKey] !== undefined) {
          el.setAttribute(attribute, el[cacheKey]);
          delete el[cacheKey];
        }
      }
    });

    document.querySelectorAll("[data-lang-btn]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.langBtn === lang));
      b.classList.toggle("active", b.dataset.langBtn === lang);
    });
  }

  function buildToggle() {
    if (document.querySelector(".lang-toggle")) return;
    const nav = document.querySelector(".public-nav");
    if (!nav) return;
    const wrap = document.createElement("div");
    wrap.className = "lang-toggle";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Language / Idioma");
    wrap.innerHTML =
      '<button type="button" data-lang-btn="es" aria-pressed="true">ES</button>' +
      '<button type="button" data-lang-btn="en" aria-pressed="false">EN</button>';
    nav.appendChild(wrap);
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lang-btn]");
      if (!btn) return;
      apply(btn.dataset.langBtn);
    });
  }

  function init() {
    buildToggle();
    let saved = "es";
    try { saved = localStorage.getItem(LANG_KEY) || "es"; } catch (e) {}
    if (saved === "en") apply("en");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // re-aplicar tras cambios de página SPA (render dinámico)
  // con debounce: el observer dispara apply() que a su vez toca el DOM → bucle infinito si no
  let pending = null;
  const obs = new MutationObserver(() => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      buildToggle();
      if (current === "en") apply("en");
    }, 120);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  window.SY_I18N = { apply, get lang() { return current; } };
})();
