"""Synthetic input PDF and manifest; use bundled Python with reportlab/pypdf."""
from pathlib import Path
import hashlib
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

out = Path('evaluations/fixtures')
out.mkdir(parents=True, exist_ok=True)
pages = [
    ('Campus Library Pilot', [
        'Synthetic evaluation material. No real participants or institutions.',
        'The four-week pilot enrolled 120 students at one fictional campus.',
        '96 students completed the pilot. Completion rate: 80 percent.',
        'The project tested a revised library study-space booking process.',
    ]),
    ('Observed Results', [
        'Average weekly booking administration time before the pilot: 12 hours.',
        'Average weekly booking administration time after the pilot: 9 hours.',
        'The pilot budget spent was 2400 fictional credits.',
        'These are descriptive observations, not proof of a causal effect.',
    ]),
    ('Limitations and Next Steps', [
        'There was no randomized control group.',
        'The pilot covered a single campus and lasted only four weeks.',
        'Non-completers may have had different experiences.',
        'Next step: test at additional campuses with a comparison group.',
        'No claim about grade improvement or nationwide savings is supported.',
    ]),
]
pdf = out / 'library-pilot-v1.pdf'
c = canvas.Canvas(str(pdf), pagesize=A4, invariant=1)
c.setTitle('Synthetic campus library pilot')
for n, (title, lines) in enumerate(pages, 1):
    c.setFillColorRGB(.15, .24, .35)
    c.setFont('Helvetica-Bold', 21)
    c.drawString(48, 780, title)
    c.setFillColorRGB(.1, .1, .1)
    c.setFont('Helvetica', 11)
    for i, line in enumerate(lines):
        c.drawString(48, 730-i*34, line)
    c.setFont('Helvetica', 9)
    c.drawString(48, 38, f'Synthetic fixture v1 | Page {n} of 3')
    c.showPage()
c.save()
reader = PdfReader(pdf)
assert len(reader.pages) == 3
for page, (_, lines) in zip(reader.pages, pages):
    assert all(line in page.extract_text() for line in lines)
manifest = {'version': 'fixtures-v1', 'provenance': 'synthetic', 'files': {}}
for filename in ['sales-v1.xlsx', 'library-pilot-v1.pdf']:
    manifest['files'][filename] = hashlib.sha256((out/filename).read_bytes()).hexdigest()
manifest['bundleSha256'] = hashlib.sha256(json.dumps(manifest['files'],sort_keys=True,separators=(',', ':')).encode()).hexdigest()
(out/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
print(json.dumps(manifest))
