(() => {
  'use strict';

  // Capture is local QA only and requires an explicit server flag. No browser persistence or GHL transport.
  const copy = {
    es: {
      title: 'Tu registro · Sin Yolanda El Paso',
      skip: 'Ir al registro', homeLabel: 'Sin Yolanda, inicio', navigation: 'Navegación',
      branch: 'El Paso', location: 'Sin Yolanda El Paso', welcome: 'Qué gusto tenerte aquí.',
      intro: 'Regístrate en el programa de lealtad de Sin Yolanda El Paso. Tú eliges si recibes novedades por correo.',
      photoAlt: 'Persona con sombrero y micrófono en una terraza.',
      formTitle: 'Tu registro', requiredHint: 'Nombre y correo son los datos obligatorios.',
      name: 'Nombre completo', email: 'Correo electrónico', phone: 'Teléfono', optional: 'Opcional',
      phoneHint: 'Incluye + y el código de país.', birthday: 'Cumpleaños', birthdayHint: 'Día y mes, sin año.',
      privacyTitle: 'Sobre tus datos y privacidad',
      privacyBody: 'Sin Yolanda El Paso usa tu nombre y correo para gestionar tu registro. El teléfono y el cumpleaños (solo día y mes) son opcionales. Los correos promocionales requieren tu autorización por separado; no autorizas mensajes SMS ni WhatsApp.',
      privacyStorage: 'El registro propio está en preparación. Esta vista previa no envía ni almacena datos.',
      privacyStorageQA: 'La prueba local guarda los registros cifrados en almacenamiento propio. La sincronización con GoHighLevel está desactivada.',
      privacyContact: 'Para consultas, puedes contactar a @sinyolandaelpaso en Instagram. El correo de privacidad y el responsable están pendientes de confirmación.',
      privacyDraft: 'Borrador de prueba local del 9 de octubre de 2026. Antes de publicar, se deben verificar el responsable, el contacto de privacidad y la custodia de los datos; no es el aviso legal definitivo.',
      privacyLink: 'Contactar a Sin Yolanda El Paso ↗', consentLegend: 'Autorizaciones',
      consent: 'He leído el aviso de privacidad y autorizo el uso de mis datos para gestionar mi registro.',
      marketing: 'Quiero recibir novedades y promociones de Sin Yolanda por correo.',
      marketingHint: 'Opcional. Puedes darte de baja cuando quieras.',
      button: 'Registro en preparación', previewNote: 'Vista previa local. No envía ni guarda tus datos.',
      qaNote: 'Prueba local: usa datos ficticios. No se envían a GHL.',
      qaButton: 'Guardar registro de prueba', pendingButton: 'Guardando prueba…',
      qaFootnote: 'Solo se guarda en el almacenamiento local de prueba.',
      configUnavailable: 'Conexión local no disponible. Esta vista previa no guarda datos.',
      successTitle: 'Registro de prueba guardado',
      successBody: 'La prueba quedó guardada en el almacenamiento local cifrado. No se envió a GoHighLevel.',
      newRegistration: 'Hacer otra prueba',
      backToBranch: 'Volver a El Paso',
      nameMissing: 'Escribe tu nombre.', emailMissing: 'Escribe tu correo electrónico.',
      emailInvalid: 'Revisa tu correo, por ejemplo: nombre@correo.com.',
      phoneInvalid: 'Incluye + y el código de país, por ejemplo: +19155550123.',
      birthdayInvalid: 'Escribe un día y mes válidos en formato DD/MM.',
      consentMissing: 'Autoriza el uso de tus datos para gestionar tu registro.',
      languageLabel: 'View in English', languageButton: 'English',
      errors: {
        invalid_fields: 'Revisa los datos del formulario y vuelve a intentar.',
        consent_required: 'Autoriza el uso de tus datos antes de guardar.',
        invalid_date: 'Revisa el cumpleaños: usa un día y mes válidos en DD/MM.',
        invalid_phone: 'Revisa el teléfono e incluye + y el código de país.',
        idempotency_conflict: 'Este intento está en conflicto. Revisa los datos antes de volver a guardar.',
        rate_limited: 'Hay demasiados intentos. Espera un momento antes de volver a guardar.',
        verification_failed: 'No pudimos verificar la prueba. Recarga la página e intenta de nuevo.',
        unavailable: 'No pudimos confirmar el guardado. Inténtalo de nuevo; se conservará el mismo intento.',
      },
    },
    en: {
      title: 'Your registration · Sin Yolanda El Paso',
      skip: 'Skip to registration', homeLabel: 'Sin Yolanda, home', navigation: 'Navigation',
      branch: 'El Paso', location: 'Sin Yolanda El Paso', welcome: 'Glad to have you here.',
      intro: 'Join the Sin Yolanda El Paso loyalty program. You choose whether to receive news by email.',
      photoAlt: 'Person wearing a hat and holding a microphone on a terrace.',
      formTitle: 'Your registration', requiredHint: 'Name and email are the required details.',
      name: 'Full name', email: 'Email address', phone: 'Phone number', optional: 'Optional',
      phoneHint: 'Include + and your country code.', birthday: 'Birthday', birthdayHint: 'Day and month, no year.',
      privacyTitle: 'Your details and privacy',
      privacyBody: 'Sin Yolanda El Paso uses your name and email to manage your registration. Your phone number and birthday (day and month only) are optional. Promotional emails require your separate permission; you are not consenting to SMS or WhatsApp messages.',
      privacyStorage: 'The custom registration is being prepared. This preview does not send or store details.',
      privacyStorageQA: 'The local test stores registrations encrypted in our own storage. Synchronization with GoHighLevel is disabled.',
      privacyContact: 'For questions, contact @sinyolandaelpaso on Instagram. The privacy email and responsible party are awaiting confirmation.',
      privacyDraft: 'Local test draft dated October 9, 2026. Before publication, the responsible party, privacy contact and data custody must be verified; this is not the final legal notice.',
      privacyLink: 'Contact Sin Yolanda El Paso ↗', consentLegend: 'Permissions',
      consent: 'I have read the privacy notice and authorize the use of my details to manage my registration.',
      marketing: 'I would like to receive Sin Yolanda news and promotions by email.',
      marketingHint: 'Optional. You can unsubscribe at any time.',
      button: 'Registration coming soon', previewNote: 'Local preview. Your details are not sent or saved.',
      qaNote: 'Local test: use fictional details. Nothing is sent to GHL.',
      qaButton: 'Save test registration', pendingButton: 'Saving test…',
      qaFootnote: 'Saved only in local test storage.',
      configUnavailable: 'Local connection unavailable. This preview does not save details.',
      successTitle: 'Test registration saved',
      successBody: 'The test was saved in encrypted local storage. Nothing was sent to GoHighLevel.',
      newRegistration: 'Start another test',
      backToBranch: 'Back to El Paso',
      nameMissing: 'Enter your name.', emailMissing: 'Enter your email address.',
      emailInvalid: 'Check your email, for example: name@example.com.',
      phoneInvalid: 'Include + and your country code, for example: +19155550123.',
      birthdayInvalid: 'Enter a valid day and month in DD/MM format.',
      consentMissing: 'Allow us to use your details to manage your registration.',
      languageLabel: 'Ver en español', languageButton: 'Español',
      errors: {
        invalid_fields: 'Check the form details and try again.',
        consent_required: 'Allow us to use your details before saving.',
        invalid_date: 'Check the birthday: use a valid day and month in DD/MM format.',
        invalid_phone: 'Check the phone number and include + and your country code.',
        idempotency_conflict: 'This attempt has a conflict. Check the details before saving again.',
        rate_limited: 'Too many attempts. Wait a moment before saving again.',
        verification_failed: 'We could not verify the test. Reload the page and try again.',
        unavailable: 'We could not confirm the save. Try again; the same attempt will be kept.',
      },
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
  const marketing = document.getElementById('email-marketing');
  const website = document.getElementById('website');
  const button = document.getElementById('register-button');
  const captureNote = document.getElementById('capture-note');
  const serverError = document.getElementById('server-error');
  const success = document.getElementById('registration-success');
  const sheet = document.getElementById('registration');
  const consentVersion = 'sy-el-paso-registration-v2-2026-10-09';
  const receiptPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let captureEnabled = false;
  let configFailed = false;
  let pending = false;
  let failureCode = '';
  let attempt;

  function renderState() {
    button.disabled = !captureEnabled || pending;
    button.textContent = copy[language][pending ? 'pendingButton' : captureEnabled ? 'qaButton' : 'button'];
    captureNote.hidden = !captureEnabled && !configFailed;
    captureNote.textContent = copy[language][configFailed ? 'configUnavailable' : 'qaNote'];
    document.getElementById('preview-note').textContent = copy[language][captureEnabled ? 'qaFootnote' : 'previewNote'];
    document.querySelectorAll('[data-copy="privacyStorage"]').forEach(node => {
      node.textContent = copy[language][captureEnabled ? 'privacyStorageQA' : 'privacyStorage'];
    });
    serverError.hidden = !failureCode;
    serverError.textContent = failureCode ? copy[language].errors[failureCode] : '';
    sheet.setAttribute('aria-busy', String(pending));
    [...Object.values(fields), marketing, website].forEach(field => { field.disabled = pending; });
  }

  async function loadConfig() {
    try {
      const response = await fetch('./intake-config.json', { method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error' });
      const config = await response.json();
      if (response.status !== 200 || config.qaOnly !== true || config.consentVersion !== consentVersion || typeof config.captureEnabled !== 'boolean') throw new Error('Unavailable');
      if (config.captureEnabled && typeof crypto?.randomUUID !== 'function') throw new Error('Unavailable');
      captureEnabled = config.captureEnabled;
      configFailed = false;
    } catch {
      captureEnabled = false;
      configFailed = true;
    }
    renderState();
  }

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
      return /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s().-]/g, '')) ? undefined : 'phoneInvalid';
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
    renderState();
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

  form.addEventListener('submit', async event => {
    // Native form navigation is always blocked. Only explicit local QA may use the fixed API.
    event.preventDefault();
    if (pending || !success.hidden) return;
    const invalid = Object.keys(fields).filter(key => { touched.add(key); return !validateField(key); });
    if (invalid.length) { fields[invalid[0]].focus(); return; }
    if (!captureEnabled) { renderState(); return; }
    const payload = {
      full_name: fields.name.value.trim(), email: fields.email.value.trim(),
      phone: fields.phone.value.trim().replace(/[\s().-]/g, '') || null,
      birthday_day_month: fields.birthday.value.trim() || null,
      locale: language, branch: 'el-paso', registration_consent: fields.consent.checked,
      email_marketing_consent: marketing.checked, consent_version: consentVersion,
      turnstile_token: 'local-qa-only', website: website.value.trim(),
    };
    const signature = JSON.stringify(payload);
    if (!attempt || attempt.signature !== signature) attempt = { signature, key: crypto.randomUUID() };
    pending = true;
    failureCode = '';
    renderState();
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key },
        body: signature, signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (![200, 201].includes(response.status) || result.status !== 'received' || !receiptPattern.test(result.receipt_id || '') || result.sync_status !== 'pending') {
        failureCode = Object.hasOwn(copy[language].errors, result.code) ? result.code : 'unavailable';
      } else {
        resetFields();
        form.hidden = true;
        success.hidden = false;
        success.focus();
      }
    } catch {
      failureCode = 'unavailable';
    } finally {
      pending = false;
      renderState();
    }
  });

  function resetFields() {
    form.reset();
    attempt = undefined;
    failureCode = '';
    touched.clear();
    Object.keys(fields).forEach(key => {
      fields[key].removeAttribute('aria-invalid');
      const error = document.getElementById(`${key}-error`);
      error.hidden = true;
      error.textContent = '';
    });
  }

  document.getElementById('new-registration').addEventListener('click', () => {
    resetFields();
    success.hidden = true;
    form.hidden = false;
    renderState();
    fields.name.focus();
  });

  // Keep a reload empty and opt-ins unselected, including browser history restoration.
  window.addEventListener('pageshow', () => {
    resetFields();
    success.hidden = true;
    form.hidden = false;
    setLanguage('es');
  });
  void loadConfig();
})();
