import zipfile
import xml.etree.ElementTree as ET

docx_path = r"E:\ETAC enterpriise\FORM\DEALER FORM.docx"
try:
    with zipfile.ZipFile(docx_path) as docx:
        xml_content = docx.read('word/document.xml')
        
    tree = ET.fromstring(xml_content)
    namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    paragraphs = []
    for p in tree.findall('.//w:p', namespace):
        texts = [node.text for node in p.findall('.//w:t', namespace) if node.text]
        if texts:
            paragraphs.append(''.join(texts))
            
    for p in paragraphs:
        print(p)
except Exception as e:
    print(f"Error: {e}")
