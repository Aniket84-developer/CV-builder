// ========== State ==========
let passportBase64 = null;
let nagriktaBase64 = null;
let experiences = [];

// ========== Helpers ==========
function $(id) {
  return document.getElementById(id);
}

function setStatus(el, msg, type) {
  el.textContent = msg;
  el.className = 'status ' + (type || '');
}

function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getApiKey() {
  return localStorage.getItem('openai_api_key') || '';
}

function getPureBase64(dataUrl) {
  return dataUrl.split(',')[1];
}

function getMimeType(dataUrl) {
  return dataUrl.split(';')[0].split(':')[1];
}

// Better JSON cleaner
function cleanAndParseJSON(text) {
  // Remove markdown code blocks
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  // Try to extract only the JSON object
  var firstBrace = text.indexOf('{');
  var lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  
  return JSON.parse(text);
}

// ========== API Key ==========
$('saveKeyBtn').addEventListener('click', function() {
  var key = $('apiKey').value.trim();
  if (!key) {
    setStatus($('keyStatus'), 'Please enter your Google Gemini API key', 'error');
    return;
  }
  localStorage.setItem('openai_api_key', key);
  setStatus($('keyStatus'), 'Gemini API key saved successfully.', 'success');
  $('apiKey').value = '';
});

$('clearKeyBtn').addEventListener('click', function() {
  localStorage.removeItem('openai_api_key');
  setStatus($('keyStatus'), 'API key cleared.', 'success');
});

if (getApiKey()) {
  setStatus($('keyStatus'), 'API key is already saved in this browser.', 'success');
}

// ========== Photo Upload ==========
$('passportInput').addEventListener('change', async function(e) {
  var file = e.target.files[0];
  if (!file) return;
  passportBase64 = await fileToBase64(file);
  $('passportPreview').innerHTML = '<img src="' + passportBase64 + '" alt="Passport">';
  checkAnalyzeReady();
});

$('nagriktaInput').addEventListener('change', async function(e) {
  var file = e.target.files[0];
  if (!file) return;
  nagriktaBase64 = await fileToBase64(file);
  $('nagriktaPreview').innerHTML = '<img src="' + nagriktaBase64 + '" alt="Nagrikta">';
  checkAnalyzeReady();
});

function checkAnalyzeReady() {
  $('analyzeBtn').disabled = !(passportBase64 && nagriktaBase64);
}

// ========== AI Analyze Photos ==========
$('analyzeBtn').addEventListener('click', async function() {
  var key = getApiKey();
  if (!key) {
    setStatus($('analyzeStatus'), 'Please save your Gemini API key first.', 'error');
    return;
  }
  if (!passportBase64 || !nagriktaBase64) {
    setStatus($('analyzeStatus'), 'Please upload both photos.', 'error');
    return;
  }

  setStatus($('analyzeStatus'), 'Analyzing photos with Gemini... please wait.', 'loading');
  $('analyzeBtn').disabled = true;

  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + key;

    var response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: 'Extract personal information from these two images (Nepali passport and citizenship card). Return ONLY a pure JSON object with these exact keys and nothing else: {"fullName":"","dob":"","parentName":"","address":"","religion":"Hindu","sex":"Male","maritalStatus":"Married","languages":"Hindi, English & Nepali","height":"","weight":"","phone":"","passportNo":"","passportIssue":"","passportExpiry":"","education":"SLC Passed"}. Use DD-MMM-YYYY for dates. If something is not visible leave empty string.'
            },
            {
              inline_data: {
                mime_type: getMimeType(passportBase64),
                data: getPureBase64(passportBase64)
              }
            },
            {
              inline_data: {
                mime_type: getMimeType(nagriktaBase64),
                data: getPureBase64(nagriktaBase64)
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      })
    });

    var data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ? data.error.message : 'API error ' + response.status);
    }

    var content = data.candidates[0].content.parts[0].text.trim();
    console.log('Raw AI response:', content); // for debugging

    var extracted = cleanAndParseJSON(content);

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
    setStatus($('analyzeStatus'), 'Details extracted successfully! You can edit any field.', 'success');
  } catch (err) {
    console.error(err);
    setStatus($('analyzeStatus'), 'Error: ' + err.message, 'error');
  } finally {
    $('analyzeBtn').disabled = false;
  }
});

// ========== Experience ==========
function renderExperiences() {
  var list = $('experienceList');
  list.innerHTML = '';

  experiences.forEach(function(exp, idx) {
    var div = document.createElement('div');
    div.className = 'exp-item';
    div.innerHTML = 
      '<button class="remove-exp" data-idx="' + idx + '" title="Remove">x</button>' +
      '<div class="exp-grid">' +
        '<div class="field"><label>Company Name</label><input type="text" data-field="company" data-idx="' + idx + '" value="' + (exp.company || '') + '" placeholder="e.g. ABC Trading Co." /></div>' +
        '<div class="field"><label>Job Title / Work</label><input type="text" data-field="work" data-idx="' + idx + '" value="' + (exp.work || '') + '" placeholder="e.g. Warehouse Supervisor" /></div>' +
        '<div class="field"><label>Years of Experience</label><input type="text" data-field="years" data-idx="' + idx + '" value="' + (exp.years || '') + '" placeholder="e.g. 3 Years" /></div>' +
        '<div class="field"><label>Country</label><input type="text" data-field="country" data-idx="' + idx + '" value="' + (exp.country || '') + '" placeholder="e.g. Kuwait" /></div>' +
      '</div>';
    list.appendChild(div);
  });

  list.querySelectorAll('input').forEach(function(input) {
    input.addEventListener('input', function(e) {
      var idx = +e.target.dataset.idx;
      var field = e.target.dataset.field;
      experiences[idx][field] = e.target.value;
    });
  });

  list.querySelectorAll('.remove-exp').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var idx = +e.target.dataset.idx;
      experiences.splice(idx, 1);
      renderExperiences();
    });
  });
}

$('addExpBtn').addEventListener('click', function() {
  experiences.push({ company: '', work: '', years: '', country: '' });
  renderExperiences();
});

experiences.push({ company: '', work: '', years: '', country: '' });
renderExperiences();

// ========== Generate CV ==========
$('generateBtn').addEventListener('click', async function() {
  var key = getApiKey();
  if (!key) {
    setStatus($('generateStatus'), 'Please save your Gemini API key first.', 'error');
    return;
  }

  var name = $('fullName').value.trim();
  if (!name) {
    setStatus($('generateStatus'), 'Please fill at least the Full Name first.', 'error');
    return;
  }

  setStatus($('generateStatus'), 'Generating Bio-Data with Gemini...', 'loading');
  $('generateBtn').disabled = true;

  var expText = experiences
    .filter(function(e) { return e.company || e.work; })
    .map(function(e) {
      return '- Company: ' + e.company + ', Position: ' + e.work + ', Duration: ' + e.years + ', Country: ' + e.country;
    })
    .join('\n') || 'No formal experience listed.';

  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + key;

    var response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'You are a professional CV writer for Nepali bio-data. Return ONLY a pure JSON object with these keys and nothing else: {"objective":"...","educationList":["..."],"experienceList":["Worked as a ... in ... for ..."],"declaration":"I hereby declare that the above furnished information are true and correct to the best of my knowledge and belief."}.\n\nPersonal details:\nName: ' + name + '\nDOB: ' + $('dob').value + '\nAddress: ' + $('address').value + '\nEducation: ' + $('education').value + '\nObjective draft: ' + $('objective').value + '\n\nWork experiences:\n' + expText
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800
        }
      })
    });

    var data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ? data.error.message : 'API error ' + response.status);
    }

    var content = data.candidates[0].content.parts[0].text.trim();
    var polished = cleanAndParseJSON(content);

    renderCV(polished);
    $('previewSection').style.display = 'block';
    setStatus($('generateStatus'), 'Bio-Data generated successfully!', 'success');
    $('previewSection').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error(err);
    setStatus($('generateStatus'), 'Error: ' + err.message, 'error');
  } finally {
    $('generateBtn').disabled = false;
  }
});

function renderCV(polished) {
  var name = $('fullName').value.trim() || 'Full Name';
  var address = $('address').value.trim() || 'Address';
  var phone = $('phone').value.trim() || '';

  var educationHtml = (polished.educationList || [$('education').value])
    .map(function(item) { return '<li>' + item + '</li>'; })
    .join('');

  var experienceHtml = (polished.experienceList || [])
    .map(function(item) { return '<li>' + item + '</li>'; })
    .join('') || '<li>Fresher / Looking for opportunity</li>';

  var html = 
    '<div class="cv-title">BIO - DATA</div>' +
    '<div class="cv-header-info"><strong>Mr. ' + name + '</strong><br>' + address + '<br>' + (phone ? phone : '') + '</div>' +
    '<div class="cv-section"><div class="cv-section-title">OBJECTIVES</div><div class="cv-body cv-objective">' + (polished.objective || $('objective').value) + '</div></div>' +
    '<div class="cv-section"><div class="cv-section-title">PERSONAL PROFILE</div><div class="cv-body"><table class="cv-profile-table">' +
      '<tr><td>Date of Birth</td><td>:</td><td>' + ($('dob').value || '-') + '</td></tr>' +
      '<tr><td>Mother\'s / Father\'s Name</td><td>:</td><td>' + ($('parentName').value || '-') + '</td></tr>' +
      '<tr><td>Address</td><td>:</td><td>' + ($('address').value || '-') + '</td></tr>' +
      '<tr><td>Religion</td><td>:</td><td>' + ($('religion').value || '-') + '</td></tr>' +
      '<tr><td>Sex</td><td>:</td><td>' + ($('sex').value || '-') + '</td></tr>' +
      '<tr><td>Marital Status</td><td>:</td><td>' + ($('marital').value || '-') + '</td></tr>' +
      '<tr><td>Languages Known</td><td>:</td><td>' + ($('languages').value || '-') + '</td></tr>' +
      '<tr><td>Height</td><td>:</td><td>' + ($('height').value || '-') + '</td></tr>' +
      '<tr><td>Weight</td><td>:</td><td>' + ($('weight').value || '-') + '</td></tr>' +
    '</table></div></div>' +
    '<div class="cv-section"><div class="cv-section-title">EDUCATIONAL QUALIFICATION</div><div class="cv-body"><ul class="cv-list">' + educationHtml + '</ul></div></div>' +
    '<div class="cv-section"><div class="cv-section-title">WORKING EXPERIENCE</div><div class="cv-body"><ul class="cv-list">' + experienceHtml + '</ul></div></div>' +
    '<div class="cv-section"><div class="cv-section-title">PASSPORT DETAILS</div><div class="cv-body"><ul class="cv-list">' +
      '<li>Passport No. : ' + ($('passportNo').value || '-') + '</li>' +
      '<li>Issue Date : ' + ($('passportIssue').value || '-') + '</li>' +
      '<li>Expiry Date : ' + ($('passportExpiry').value || '-') + '</li>' +
    '</ul></div></div>' +
    '<div class="cv-section"><div class="cv-section-title">CONCLUSION & DECLARATION</div><div class="cv-body cv-declaration">' +
      (polished.declaration || 'I hereby declare that the above furnished information are true and correct to the best of my knowledge and belief.') +
    '</div></div>';

  $('cvPreview').innerHTML = html;
}

// ========== Download / Print ==========
$('downloadPdfBtn').addEventListener('click', function() {
  var element = $('cvPreview');
  var opt = {
    margin: [10, 10, 10, 10],
    filename: ($('fullName').value.trim() || 'Bio-Data') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
});

$('printBtn').addEventListener('click', function() {
  window.print();
});
