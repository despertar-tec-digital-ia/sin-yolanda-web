(() => {
  'use strict';

  // Capture requires a validated mode. The local runner can enable QA only; no browser persistence.
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
      privacyStorageProduction: 'Tus datos se guardan cifrados en almacenamiento propio para gestionar tu registro.',
      privacyContact: 'Para consultas, puedes contactar a @sinyolandaelpaso en Instagram. El correo de privacidad y el responsable están pendientes de confirmación.',
      privacyDraft: 'Borrador del 9 de octubre de 2026. Antes de publicar, se deben verificar el responsable, el contacto de privacidad y la custodia de los datos; no es el aviso legal definitivo.',
      privacyLink: 'Contactar a Sin Yolanda El Paso ↗', consentLegend: 'Autorizaciones',
      consent: 'He leído el aviso de privacidad y autorizo el uso de mis datos para gestionar mi registro.',
      marketing: 'Quiero recibir novedades y promociones de Sin Yolanda por correo.',
      marketingHint: 'Opcional. Puedes darte de baja cuando quieras.',
      button: 'Registro en preparación', previewNote: 'Vista previa local. No envía ni guarda tus datos.',
      qaNote: 'Prueba local: usa datos ficticios. No se envían a GHL.',
      privateReviewNotice: 'Prueba privada: usa únicamente datos ficticios. No se envían a GHL ni se activan mensajes.',
      qaButton: 'Guardar registro de prueba', pendingButton: 'Guardando prueba…',
      productionButton: 'Registrarme', productionPending: 'Guardando registro…',
      productionFootnote: 'Recibir correos promocionales es opcional.',
      qaFootnote: 'Solo se guarda en el almacenamiento local de prueba.',
      qaVerificationFailed: 'No pudimos verificar la prueba local. Recarga la página e intenta de nuevo.',
      configUnavailable: 'Conexión local no disponible. Esta vista previa no guarda datos.',
      verificationLabel: 'Verificación de seguridad', verificationRetry: 'Reintentar verificación',
      verificationLoading: 'Cargando verificación…', verificationWaiting: 'Completa la verificación para registrarte.',
      verificationReady: 'Verificación completada.', verificationExpired: 'La verificación caducó. Complétala de nuevo.',
      verificationError: 'La verificación no está disponible. Reinténtala sin borrar tus datos.',
      successTitle: 'Registro de prueba guardado',
      successBody: 'La prueba quedó guardada en el almacenamiento local cifrado. No se envió a GoHighLevel.',
      newRegistration: 'Hacer otra prueba',
      productionSuccessTitle: 'Tu registro quedó guardado',
      productionSuccessBody: 'Gracias por ser parte de Sin Yolanda El Paso.',
      productionNewRegistration: 'Hacer otro registro',
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
        verification_failed: 'No pudimos verificar el registro. Completa la verificación de nuevo antes de reintentar.',
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
      privacyStorageProduction: 'Your details are saved encrypted in our own storage to manage your registration.',
      privacyContact: 'For questions, contact @sinyolandaelpaso on Instagram. The privacy email and responsible party are awaiting confirmation.',
      privacyDraft: 'Draft dated October 9, 2026. Before publication, the responsible party, privacy contact and data custody must be verified; this is not the final legal notice.',
      privacyLink: 'Contact Sin Yolanda El Paso ↗', consentLegend: 'Permissions',
      consent: 'I have read the privacy notice and authorize the use of my details to manage my registration.',
      marketing: 'I would like to receive Sin Yolanda news and promotions by email.',
      marketingHint: 'Optional. You can unsubscribe at any time.',
      button: 'Registration coming soon', previewNote: 'Local preview. Your details are not sent or saved.',
      qaNote: 'Local test: use fictional details. Nothing is sent to GHL.',
      privateReviewNotice: 'Private test: use fictional details only. Nothing is sent to GHL and no messages are activated.',
      qaButton: 'Save test registration', pendingButton: 'Saving test…',
      productionButton: 'Register', productionPending: 'Saving registration…',
      productionFootnote: 'Receiving promotional emails is optional.',
      qaFootnote: 'Saved only in local test storage.',
      qaVerificationFailed: 'We could not verify the local test. Reload the page and try again.',
      configUnavailable: 'Local connection unavailable. This preview does not save details.',
      verificationLabel: 'Security verification', verificationRetry: 'Retry verification',
      verificationLoading: 'Loading verification…', verificationWaiting: 'Complete verification to register.',
      verificationReady: 'Verification complete.', verificationExpired: 'Verification expired. Complete it again.',
      verificationError: 'Verification is unavailable. Retry it without clearing your details.',
      successTitle: 'Test registration saved',
      successBody: 'The test was saved in encrypted local storage. Nothing was sent to GoHighLevel.',
      newRegistration: 'Start another test',
      productionSuccessTitle: 'Your registration was saved',
      productionSuccessBody: 'Thank you for being part of Sin Yolanda El Paso.',
      productionNewRegistration: 'Start another registration',
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
        verification_failed: 'We could not verify the registration. Complete verification again before retrying.',
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
  const verification = document.getElementById('verification');
  const widgetContainer = document.getElementById('turnstile-widget');
  const verificationStatus = document.getElementById('verification-status');
  const verificationRetry = document.getElementById('verification-retry');
  const consentVersion = 'sy-el-paso-registration-v2-2026-10-09';
  const turnstileScript = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  const receiptPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let captureEnabled = false;
  let mode = 'disabled';
  let siteKey = '';
  let configFailed = false;
  let pending = false;
  let failureCode = '';
  let attempt;
  let verificationState = 'loading';
  let verificationToken = '';
  let widgetId;
  let widgetLanguage;
  let widgetSize;
  let widgetGeneration = 0;
  let tokenExpiry;
  let scriptLoading;
  const revokedTokens = new Set();

  const production = () => captureEnabled && mode === 'production';

  function clearToken() {
    if (verificationToken) revokedTokens.add(verificationToken);
    verificationToken = '';
    clearTimeout(tokenExpiry);
    tokenExpiry = undefined;
  }

  function removeWidget() {
    widgetGeneration++;
    clearToken();
    revokedTokens.clear();
    if (widgetId !== undefined) {
      try { window.turnstile?.remove(widgetId); } catch { /* Remain closed if the provider is unavailable. */ }
    }
    widgetId = undefined;
    widgetLanguage = undefined;
    widgetSize = undefined;
  }

  function renderState() {
    const real = production();
    button.disabled = !captureEnabled || pending || (real && !verificationToken);
    button.textContent = copy[language][pending ? real ? 'productionPending' : 'pendingButton' : real ? 'productionButton' : captureEnabled ? 'qaButton' : 'button'];
    captureNote.hidden = (!captureEnabled || real) && !configFailed;
    captureNote.textContent = copy[language][configFailed ? 'configUnavailable' : 'qaNote'];
    document.getElementById('preview-note').textContent = copy[language][real ? 'productionFootnote' : captureEnabled ? 'qaFootnote' : 'previewNote'];
    document.querySelectorAll('[data-copy="privacyStorage"]').forEach(node => {
      node.textContent = copy[language][real ? 'privacyStorageProduction' : captureEnabled ? 'privacyStorageQA' : 'privacyStorage'];
    });
    document.getElementById('success-title').textContent = copy[language][real ? 'productionSuccessTitle' : 'successTitle'];
    document.querySelectorAll('[data-copy="successBody"]').forEach(node => {
      node.textContent = copy[language][real ? 'productionSuccessBody' : 'successBody'];
    });
    document.getElementById('new-registration').textContent = copy[language][real ? 'productionNewRegistration' : 'newRegistration'];
    verification.hidden = !real || !success.hidden;
    verificationStatus.textContent = copy[language][`verification${verificationState[0].toUpperCase()}${verificationState.slice(1)}`];
    verificationRetry.hidden = !real || !['error', 'expired'].includes(verificationState);
    verificationRetry.disabled = pending;
    serverError.hidden = !failureCode;
    serverError.textContent = failureCode ? failureCode === 'verification_failed' && !real ? copy[language].qaVerificationFailed : copy[language].errors[failureCode] : '';
    sheet.setAttribute('aria-busy', String(pending));
    [...Object.values(fields), marketing, website].forEach(field => { field.disabled = pending; });
  }

  function validConfig(config) {
    if (!config || Array.isArray(config) || config.consentVersion !== consentVersion || typeof config.captureEnabled !== 'boolean' || typeof config.qaOnly !== 'boolean') return false;
    if (!config.captureEnabled) return config.mode === 'disabled' && config.qaOnly === true;
    if (typeof crypto?.randomUUID !== 'function') return false;
    if (config.mode === 'local-qa') return config.qaOnly === true && config.turnstileSiteKey === undefined;
    // Public sitekey syntax only; the server must still validate the token, hostname and action.
    return config.mode === 'production' && config.qaOnly === false && typeof config.turnstileSiteKey === 'string' && /^0x[A-Za-z0-9_-]{20,98}$/.test(config.turnstileSiteKey);
  }

  function loadTurnstile() {
    if (typeof window.turnstile?.render === 'function' && typeof window.turnstile?.reset === 'function' && typeof window.turnstile?.remove === 'function') return Promise.resolve();
    if (scriptLoading) return scriptLoading;
    scriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const finish = failed => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (failed || typeof window.turnstile?.render !== 'function' || typeof window.turnstile?.reset !== 'function' || typeof window.turnstile?.remove !== 'function') {
          script.remove();
          reject(new Error('Verification unavailable'));
        } else resolve();
      };
      const timeout = setTimeout(() => finish(true), 10000);
      script.src = turnstileScript;
      script.async = true;
      script.addEventListener('load', () => finish(false));
      script.addEventListener('error', () => finish(true));
      document.head.appendChild(script);
    }).catch(error => { scriptLoading = undefined; throw error; });
    return scriptLoading;
  }

  async function ensureWidget() {
    if (!production() || !success.hidden || pending) return;
    const size = widgetContainer.clientWidth < 300 ? 'compact' : 'flexible';
    if (widgetId !== undefined && widgetLanguage === language && widgetSize === size) return;
    removeWidget();
    verificationState = 'loading';
    const generation = widgetGeneration;
    renderState();
    try {
      await loadTurnstile();
      if (generation !== widgetGeneration || !production() || !success.hidden) return;
      const current = () => generation === widgetGeneration && production() && success.hidden;
      const close = state => {
        if (!current()) return;
        clearToken();
        verificationState = state;
        renderState();
      };
      verificationState = 'waiting';
      widgetLanguage = language;
      widgetSize = size;
      widgetId = window.turnstile.render(widgetContainer, {
        sitekey: siteKey, action: 'loyalty_register', language, theme: 'light', size,
        'response-field': false, retry: 'never', 'refresh-expired': 'manual', 'refresh-timeout': 'manual',
        callback: token => {
          if (!current()) return;
          clearToken();
          if (typeof token !== 'string' || !token || token.length > 2048 || /\s/.test(token) || revokedTokens.has(token)) {
            verificationState = 'error';
          } else {
            verificationToken = token;
            verificationState = 'ready';
            // Fail closed even if an expiry callback is missed; tokens expire after five minutes.
            tokenExpiry = setTimeout(() => close('expired'), 295000);
          }
          renderState();
        },
        'expired-callback': () => close('expired'),
        'timeout-callback': () => close('expired'),
        'unsupported-callback': () => close('error'),
        'error-callback': () => { close('error'); return true; },
      });
      if (typeof widgetId !== 'string' && typeof widgetId !== 'number') throw new Error('Verification unavailable');
    } catch {
      if (generation !== widgetGeneration) return;
      removeWidget();
      verificationState = 'error';
    }
    renderState();
  }

  function resetVerification() {
    if (!production()) return;
    clearToken();
    verificationState = 'waiting';
    if (widgetId !== undefined) {
      try { window.turnstile.reset(widgetId); } catch { removeWidget(); verificationState = 'error'; }
    } else void ensureWidget();
    renderState();
  }

  async function loadConfig() {
    try {
      // Keep a private same-origin gate; never send authentication to other origins.
      const response = await fetch('./intake-config.json', { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
      const config = await response.json();
      if (response.status !== 200 || !validConfig(config)) throw new Error('Unavailable');
      captureEnabled = config.captureEnabled;
      mode = config.mode;
      siteKey = production() ? config.turnstileSiteKey : '';
      configFailed = false;
    } catch {
      captureEnabled = false;
      mode = 'disabled';
      siteKey = '';
      removeWidget();
      configFailed = true;
    }
    renderState();
    void ensureWidget();
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
    void ensureWidget();
  }

  languageToggle.addEventListener('click', () => setLanguage(language === 'es' ? 'en' : 'es'));
  verificationRetry.addEventListener('click', () => { if (!pending) resetVerification(); });
  window.addEventListener('resize', () => { void ensureWidget(); });
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
    // Native form navigation is always blocked. The API stays same-origin in every mode.
    event.preventDefault();
    if (pending || !success.hidden) return;
    const invalid = Object.keys(fields).filter(key => { touched.add(key); return !validateField(key); });
    if (invalid.length) { fields[invalid[0]].focus(); return; }
    if (!captureEnabled) { renderState(); return; }
    if (production() && !verificationToken) { renderState(); verification.focus(); return; }
    const payload = {
      full_name: fields.name.value.trim(), email: fields.email.value.trim(),
      phone: fields.phone.value.trim().replace(/[\s().-]/g, '') || null,
      birthday_day_month: fields.birthday.value.trim() || null,
      locale: language, branch: 'el-paso', registration_consent: fields.consent.checked,
      email_marketing_consent: marketing.checked, consent_version: consentVersion,
      website: website.value.trim(),
    };
    // Verification tokens are single-use, but a retry of the same registration keeps its key.
    const signature = JSON.stringify(payload);
    if (!attempt || attempt.signature !== signature) attempt = { signature, key: crypto.randomUUID() };
    const body = JSON.stringify({ ...payload, turnstile_token: production() ? verificationToken : 'local-qa-only' });
    if (production()) clearToken();
    pending = true;
    failureCode = '';
    renderState();
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key },
        body, signal: AbortSignal.timeout(10000),
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
      if (production() && success.hidden) resetVerification();
      renderState();
      void ensureWidget();
    }
  });

  function resetFields() {
    form.reset();
    attempt = undefined;
    failureCode = '';
    touched.clear();
    removeWidget();
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
    void ensureWidget();
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
