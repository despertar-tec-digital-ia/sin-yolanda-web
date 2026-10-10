(() => {
  'use strict';

  // Visual proposal only. No transport, persistence, tracking or GHL connection.
  const copy = {
    es: {
      title: 'Tu registro · Sin Yolanda El Paso',
      skip: 'Ir al registro', homeLabel: 'Sin Yolanda, inicio', navigation: 'Navegación',
      branch: 'El Paso', location: 'Sin Yolanda El Paso', welcome: 'Qué gusto tenerte aquí.',
      intro: 'Regístrate en el programa de lealtad de Sin Yolanda El Paso. Tú eliges si recibes novedades por correo.',
      photoAlt: 'Persona con sombrero y micrófono en una terraza.',
      formTitle: 'Tu registro', requiredHint: 'Nombre y correo son los datos obligatorios.',
      name: 'Nombre completo', email: 'Correo electrónico', phone: 'Teléfono', optional: 'Opcional',
      phoneHint: 'Incluye el código de país.', birthday: 'Cumpleaños', birthdayHint: 'Día y mes, sin año.',
      privacyTitle: 'Sobre tus datos y privacidad',
      privacyBody: 'Sin Yolanda El Paso usa tu nombre y correo para gestionar tu registro. El teléfono y el cumpleaños (solo día y mes) son opcionales. Los correos promocionales requieren tu autorización por separado; no autorizas mensajes SMS ni WhatsApp.',
      privacyStorage: 'El formulario temporal vigente conserva los contactos en GoHighLevel para su gestión.',
      privacyContact: 'Para consultas, puedes contactar a @sinyolandaelpaso en Instagram. El correo de privacidad y el responsable están pendientes de confirmación.',
      privacyDraft: 'Borrador del 9 de octubre de 2026, basado en el registro temporal. El aviso del registro propio necesita revisión del responsable y del almacenamiento antes de publicarse.',
      privacyLink: 'Contactar a Sin Yolanda El Paso ↗', consentLegend: 'Autorizaciones',
      consent: 'He leído el aviso de privacidad y autorizo el uso de mis datos para gestionar mi registro.',
      marketing: 'Quiero recibir novedades y promociones de Sin Yolanda por correo.',
      marketingHint: 'Opcional. Puedes darte de baja cuando quieras.',
      button: 'Registro en preparación', previewNote: 'Vista previa local. No envía ni guarda tus datos.',
      backToBranch: 'Volver a El Paso',
      nameMissing: 'Escribe tu nombre.', emailMissing: 'Escribe tu correo electrónico.',
      emailInvalid: 'Revisa tu correo, por ejemplo: nombre@correo.com.',
      phoneInvalid: 'Usa un número de teléfono válido con código de país.',
      birthdayInvalid: 'Escribe un día y mes válidos en formato DD/MM.',
      consentMissing: 'Autoriza el uso de tus datos para gestionar tu registro.',
      languageLabel: 'View in English', languageButton: 'English',
    },
    en: {
      title: 'Your registration · Sin Yolanda El Paso',
      skip: 'Skip to registration', homeLabel: 'Sin Yolanda, home', navigation: 'Navigation',
      branch: 'El Paso', location: 'Sin Yolanda El Paso', welcome: 'Glad to have you here.',
      intro: 'Join the Sin Yolanda El Paso loyalty program. You choose whether to receive news by email.',
      photoAlt: 'Person wearing a hat and holding a microphone on a terrace.',
      formTitle: 'Your registration', requiredHint: 'Name and email are the required details.',
      name: 'Full name', email: 'Email address', phone: 'Phone number', optional: 'Optional',
      phoneHint: 'Include your country code.', birthday: 'Birthday', birthdayHint: 'Day and month, no year.',
      privacyTitle: 'Your details and privacy',
      privacyBody: 'Sin Yolanda El Paso uses your name and email to manage your registration. Your phone number and birthday (day and month only) are optional. Promotional emails require your separate permission; you are not consenting to SMS or WhatsApp messages.',
      privacyStorage: 'The current temporary form stores contacts in GoHighLevel for contact management.',
      privacyContact: 'For questions, contact @sinyolandaelpaso on Instagram. The privacy email and responsible party are awaiting confirmation.',
      privacyDraft: 'Draft dated October 9, 2026, based on the temporary registration. The notice for the custom registration needs review of the responsible party and storage before publication.',
      privacyLink: 'Contact Sin Yolanda El Paso ↗', consentLegend: 'Permissions',
      consent: 'I have read the privacy notice and authorize the use of my details to manage my registration.',
      marketing: 'I would like to receive Sin Yolanda news and promotions by email.',
      marketingHint: 'Optional. You can unsubscribe at any time.',
      button: 'Registration coming soon', previewNote: 'Local preview. Your details are not sent or saved.',
      backToBranch: 'Back to El Paso',
      nameMissing: 'Enter your name.', emailMissing: 'Enter your email address.',
      emailInvalid: 'Check your email, for example: name@example.com.',
      phoneInvalid: 'Use a valid phone number with a country code.',
      birthdayInvalid: 'Enter a valid day and month in DD/MM format.',
      consentMissing: 'Allow us to use your details to manage your registration.',
      languageLabel: 'Ver en español', languageButton: 'Español',
    },
  };

  let language = 'es';
  const form = document.getElementById('intake-form');
  const fields = {
    name: document.getElementById('full-name'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    birthday: document.getElementById('birthday'),
    consent: document.getElementById('consent'),
  };
  const touched = new Set();
  const languageToggle = document.getElementById('language-toggle');

  // Do not interpret the date as a full birth date or infer a year.
  function validDayMonth(value) {
    if (!value) return true;
    const match = /^(\d{2})\/(\d{2})$/.exec(value);
    if (!match) return false;
    const day = Number(match[1]), month = Number(match[2]);
    const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
  }

  function errorKey(key) {
    const field = fields[key], value = field.value.trim();
    if (key === 'name') return !value ? 'nameMissing' : undefined;
    if (key === 'email') return !value ? 'emailMissing' : field.validity.typeMismatch ? 'emailInvalid' : undefined;
    if (key === 'phone' && value) {
      const digits = value.replace(/\D/g, '');
      return /^[+\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15 ? undefined : 'phoneInvalid';
    }
    if (key === 'birthday') return validDayMonth(value) ? undefined : 'birthdayInvalid';
    if (key === 'consent') return field.checked ? undefined : 'consentMissing';
    return undefined;
  }

  function validateField(key) {
    const error = document.getElementById(`${key}-error`), issue = errorKey(key);
    error.textContent = issue ? copy[language][issue] : '';
    error.hidden = !issue;
    fields[key].setAttribute('aria-invalid', String(Boolean(issue)));
    return !issue;
  }

  function setLanguage(next) {
    language = next;
    document.documentElement.lang = next;
    document.title = copy[next].title;
    document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = copy[next][node.dataset.copy]; });
    document.querySelectorAll('[data-label]').forEach(node => {
      node.setAttribute(node.tagName === 'IMG' ? 'alt' : 'aria-label', copy[next][node.dataset.label]);
    });
    languageToggle.textContent = copy[next].languageButton;
    languageToggle.lang = next === 'es' ? 'en' : 'es';
    languageToggle.setAttribute('aria-label', copy[next].languageLabel);
    touched.forEach(validateField);
  }

  languageToggle.addEventListener('click', () => setLanguage(language === 'es' ? 'en' : 'es'));
  Object.entries(fields).forEach(([key, field]) => {
    field.addEventListener('blur', () => { touched.add(key); validateField(key); });
    field.addEventListener(key === 'consent' ? 'change' : 'input', () => {
      if (touched.has(key)) validateField(key);
    });
  });

  fields.birthday.addEventListener('blur', () => {
    const value = fields.birthday.value.trim();
    const match = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(value) || /^(\d{2})(\d{2})$/.exec(value);
    if (match) fields.birthday.value = `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}`;
    validateField('birthday');
  });

  form.addEventListener('submit', event => {
    // Also block Enter and programmatic requestSubmit(). This is not a live intake.
    event.preventDefault();
    const invalid = Object.keys(fields).filter(key => { touched.add(key); return !validateField(key); });
    if (invalid.length) fields[invalid[0]].focus();
    document.getElementById('preview-note').textContent = copy[language].previewNote;
  });

  // Keep a reload empty and opt-ins unselected, even with browser history restoration.
  window.addEventListener('pageshow', () => {
    form.reset();
    touched.clear();
    Object.keys(fields).forEach(key => {
      fields[key].removeAttribute('aria-invalid');
      const error = document.getElementById(`${key}-error`);
      error.hidden = true;
      error.textContent = '';
    });
    setLanguage('es');
  });
})();
