// ========== State ==========
let passportBase64 = null;
let nagriktaBase64 = null;
let experiences = [];

// ========== Helpers ==========
function $(id) {
  return document.getElementById(id);
}

function setStatus(el, msg, type = '') {
  el.textContent = msg;
  el.className = 'status ' + type;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getApiKey() {
  return localStorage.getItem('openai_api_key') || '';
}

// ========== API Key ==========
$('saveKeyBtn').addEventListener('click', () => {
  const key = $('apiKey').value.trim();
  if (!key) {
    setStatus($('keyStatus'), 'Please enter your DeepSeek API key', 'error');
    return;
  }
  localStorage.setItem('openai_api_key', key);
  setStatus($('keyStatus'), 'DeepSeek API key saved in this browser.', 'success');
  $('apiKey').value = '';
});

$('clearKeyBtn').addEventListener('click', () => {
  localStorage.removeItem('openai_api_key');
  setStatus($('keyStatus'), 'API key cleared.', 'success');
});

// Load existing key status on start
if (getApiKey()) {
  setStatus($('keyStatus'), 'API key is already saved in this browser.', 'success');
}

// ========== Photo Upload ==========
$('passportInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  passportBase64 = await fileToBase64(file);
  \( ('passportPreview').innerHTML = `<img src=" \){passportBase64}" alt="Passport">`;
  checkAnalyzeReady();
});

$('nagriktaInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  nagriktaBase64 = await fileToBase64(file);
  \( ('nagriktaPreview').innerHTML = `<img src=" \){nagriktaBase64}" alt="Nagrikta">`;
  checkAnalyzeReady();
});

function checkAnalyzeReady() {
  $('analyzeBtn').disabled = !(passportBase64 && nagriktaBase64);
}

// ========== AI Analyze Photos ==========
// Note: DeepSeek has limited vision support. This may not work as well as GPT-4o.
$('analyzeBtn').addEventListener('click', async () => {
  const key = getApiKey();
  if (!key) {
    setStatus($('analyzeStatus'), 'Please save your DeepSeek API key first.', 'error');
    return;
  }
  if (!passportBase64 || !nagriktaBase64) {
    setStatus($('analyzeStatus'), 'Please upload both photos.', 'error');
    return;
  }

  setStatus($('analyzeStatus'), 'Analyzing photos with DeepSeek… this may take 10-20 seconds.', 'loading');
  $('analyzeBtn').disabled = true;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are an expert at reading Nepali citizenship (Nagrikta) cards and passports.
Extract all personal information accurately. Return ONLY a valid JSON object with these exact keys:
{
  "fullName": "",
  "dob": "",
  "parentName": "",
  "address": "",
  "religion": "Hindu",
  "sex": "Male",
  "maritalStatus": "Married",
  "languages": "Hindi, English & Nepali",
  "height": "",
  "weight": "",
  "phone": "",
  "passportNo": "",
  "passportIssue": "",
  "passportExpiry": "",
  "education": "SLC Passed"
}
Use DD-MMM-YYYY format for dates when possible (e.g. 10-Apr-2002).
If a field is not visible, leave it as empty string.
For parentName prefer Father's name if available, otherwise Mother's name.
Address should be like "Siraha, Nepal" or full address if available.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all personal details from these two images (Passport + Nepali Citizenship / Nagrikta). Return only the JSON.'
              },
              {
                type: 'image_url',
                image_url: { url: passportBase64 }
              },
              {
                type: 'image_url',
                image_url: { url: nagriktaBase64 }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();

    // Clean possible markdown code fences
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const extracted = JSON.parse(content);

    // Fill form
    $('fullName').value = extracted.fullName || '';
    $('dob').value = extracted.dob || '';
    $('parentName').value = extracted.parentName || '';
    $('address').value = extracted.address || '';
    $('religion').value = extracted.religion || 'Hindu';
    $('sex').value = extracted.sex || 'Male';
    $('marital').value = extracted.maritalStatus || 'Married';
    $('languages').value = extracted.languages || 'Hindi, English & Nepali';
    $('height').value = extracted.height || '';
    $('weight').value = extracted.weight || '';
    $('phone').value = extracted.phone || '';
    $('passportNo').value = extracted.passportNo || '';
    $('passportIssue').value = extracted.passportIssue || '';
    $('passportExpiry').value = extracted.passportExpiry || '';
    $('education').value = extracted.education || 'SLC Passed';

    $('extractedSection').style.display = 'block';
    setStatus($('analyzeStatus'), 'Details extracted successfully! You can edit any field below.', 'success');
  } catch (err) {
    console.error(err);
    setStatus($('analyzeStatus'), 'Error: ' + err.message + ' (DeepSeek may have limited image support. You can fill details manually.)', 'error');
  } finally {
    $('analyzeBtn').disabled = false;
  }
});

// ========== Experience ==========
function renderExperiences() {
  const list = $('experienceList');
  list.innerHTML = '';

  experiences.forEach((exp, idx) => {
    const div = document.createElement('div');
    div.className = 'exp-item';
    div.innerHTML = `
      <button class="remove-exp" data-idx="${idx}" title="Remove">×</button>
      <div class="exp-grid">
        <div class="field">
          <label>Company Name</label>
          <input type="text" data-field="company" data-idx="\( {idx}" value=" \){exp.company || ''}" placeholder="e.g. ABC Trading Co." />
        </div>
        <div class="field">
          <label>Job Title / Work</label>
          <input type="text" data-field="work" data-idx="\( {idx}" value=" \){exp.work || ''}" placeholder="e.g. Warehouse Supervisor" />
        </div>
        <div class="field">
          <label>Years of Experience</label>
          <input type="text" data-field="years" data-idx="\( {idx}" value=" \){exp.years || ''}" placeholder="e.g. 3 Years" />
        </div>
        <div class="field">
          <label>Country</label>
          <input type="text" data-field="country" data-idx="\( {idx}" value=" \){exp.country || ''}" placeholder="e.g. Kuwait" />
        </div>
      </div>
    `;
    list.appendChild(div);
  });

  // Attach listeners
  list.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = +e.target.dataset.idx;
      const field = e.target.dataset.field;
      experiences[idx][field] = e.target.value;
    });
  });

  list.querySelectorAll('.remove-exp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = +e.target.dataset.idx;
      experiences.splice(idx, 1);
      renderExperiences();
    });
  });
}

$('addExpBtn').addEventListener('click', () => {
  experiences.push({ company: '', work: '', years: '', country: '' });
  renderExperiences();
});

// Start with one empty experience
experiences.push({ company: '', work: '', years: '', country: '' });
renderExperiences();

// ========== Generate CV ==========
$('generateBtn').addEventListener('click', async () => {
  const key = getApiKey();
  if (!key) {
    setStatus($('generateStatus'), 'Please save your DeepSeek API key first.', 'error');
    return;
  }

  const name = $('fullName').value.trim();
  if (!name) {
    setStatus($('generateStatus'), 'Please fill at least the Full Name (run Analyze Photos first or fill manually).', 'error');
    return;
  }

  setStatus($('generateStatus'), 'Generating polished Bio-Data with DeepSeek…', 'loading');
  $('generateBtn').disabled = true;

  // Build experience text for AI
  const expText = experiences
    .filter(e => e.company || e.work)
    .map(e => `- Company: ${e.company}, Position/Work: ${e.work}, Duration: ${e.years}, Country: ${e.country}`)
    .join('\n') || 'No formal experience listed.';

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a professional CV writer specializing in Nepali bio-data format.
Given personal details and work experience, produce a clean, formal Bio-Data.
Return ONLY a valid JSON object with these keys (no extra text):
{
  "objective": "polished 1-2 sentence career objective",
  "educationList": ["item1", "item2"],
  "experienceList": ["Worked as a Warehouse Supervisor at ABC Co. in Kuwait for 3 Years", "..."],
  "declaration": "I hereby declare that the above furnished information are true and correct to the best of my knowledge and belief."
}
Make the experience lines natural and professional, matching the sample style: "Worked as a [Position] in [Country] For [Years]".
Keep education as short bullet points.`
          },
          {
            role: 'user',
            content: `Personal details:
Name: ${name}
DOB: \( { \)('dob').value}
Address: \( { \)('address').value}
Education raw: \( { \)('education').value}
Objective draft: \( { \)('objective').value}

Work experiences:
${expText}

Return the polished JSON.`
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const polished = JSON.parse(content);

    // Render the CV
    renderCV(polished);
    $('previewSection').style.display = 'block';
    setStatus($('generateStatus'), 'Bio-Data generated successfully!', 'success');

    // Scroll to preview
    $('previewSection').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error(err);
    setStatus($('generateStatus'), 'Error: ' + err.message, 'error');
  } finally {
    $('generateBtn').disabled = false;
  }
});

function renderCV(polished) {
  const name = $('fullName').value.trim() || 'Full Name';
  const address = $('address').value.trim() || 'Address';
  const phone = $('phone').value.trim() || '';

  const educationHtml = (polished.educationList || [$('education').value])
    .map(item => `<li>${item}</li>`)
    .join('');

  const experienceHtml = (polished.experienceList || [])
    .map(item => `<li>${item}</li>`)
    .join('') || '<li>Fresher / Looking for opportunity</li>';

  const html = `
    <div class="cv-title">BIO - DATA</div>

    <div class="cv-header-info">
      <strong>Mr. ${name}</strong><br>
      ${address}<br>
      ${phone ? phone : ''}
    </div>

    <div class="cv-section">
      <div class="cv-section-title">OBJECTIVES</div>
      <div class="cv-body cv-objective">${polished.objective || $('objective').value}</div>
    </div>

    <div class="cv-section">
      <div class="cv-section-title">PERSONAL PROFILE</div>
      <div class="cv-body">
        <table class="cv-profile-table">
          <tr><td>Date of Birth</td><td>:</td><td>\( { \)('dob').value || '—'}</td></tr>
          <tr><td>Mother's / Father's Name</td><td>:</td><td>\( { \)('parentName').value || '—'}</td></tr>
          <tr><td>Address</td><td>:</td><td>\( { \)('address').value || '—'}</td></tr>
          <tr><td>Religion</td><td>:</td><td>\( { \)('religion').value || '—'}</td></tr>
          <tr><td>Sex</td><td>:</td><td>\( { \)('sex').value || '—'}</td></tr>
          <tr><td>Marital Status</td><td>:</td><td>\( { \)('marital').value || '—'}</td></tr>
          <tr><td>Languages Known</td><td>:</td><td>\( { \)('languages').value || '—'}</td></tr>
          <tr><td>Height</td><td>:</td><td>\( { \)('height').value || '—'}</td></tr>
          <tr><td>Weight</td><td>:</td><td>\( { \)('weight').value || '—'}</td></tr>
        </table>
      </div>
    </div>

    <div class="cv-section">
      <div class="cv-section-title">EDUCATIONAL QUALIFICATION</div>
      <div class="cv-body">
        <ul class="cv-list">${educationHtml}</ul>
      </div>
    </div>

    <div class="cv-section">
      <div class="cv-section-title">WORKING EXPERIENCE</div>
      <div class="cv-body">
        <ul class="cv-list">${experienceHtml}</ul>
      </div>
    </div>

    <div class="cv-section">
      <div class="cv-section-title">PASSPORT DETAILS</div>
      <div class="cv-body">
        <ul class="cv-list">
          <li>Passport No. &nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;\( { \)('passportNo').value || '—'}</li>
          <li>Issue Date &nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;\( { \)('passportIssue').value || '—'}</li>
          <li>Expiry Date &nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;\( { \)('passportExpiry').value || '—'}</li>
        </ul>
      </div>
    </div>

    <div class="cv-section">
      <div class="cv-section-title">CONCLUSION & DECLARATION</div>
      <div class="cv-body cv-declaration">
        ${polished.declaration || 'I hereby declare that the above furnished information are true and correct to the best of my knowledge and belief.'}
      </div>
    </div>
  `;

  $('cvPreview').innerHTML = html;
}

// ========== Download / Print ==========
$('downloadPdfBtn').addEventListener('click', () => {
  const element = $('cvPreview');
  const opt = {
    margin: [10, 10, 10, 10],
    filename: ($('fullName').value.trim() || 'Bio-Data') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
});

$('printBtn').addEventListener('click', () => {
  window.print();
});
