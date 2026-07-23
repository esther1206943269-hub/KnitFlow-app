import os
import sys
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')
dir_path = r'E:\hwq\Knit\棒针符号'

for fname in os.listdir(dir_path):
    if fname.endswith('.svg'):
        fpath = os.path.join(dir_path, fname)
        size = os.path.getsize(fpath)
        print(f"File: {fname}, Size: {size} bytes")
        try:
            tree = ET.parse(fpath)
            root = tree.getroot()
            print(f"  Tag: {root.tag}")
            print(f"  Attribs: {root.attrib}")
            images = root.findall('.//{http://www.w3.org/2000/svg}image')
            print(f"  Embedded Images count: {len(images)}")
            for i, img in enumerate(images):
                print(f"    Image {i}: width={img.attrib.get('width')}, height={img.attrib.get('height')}")
        except Exception as e:
            print(f"  Error parsing XML: {e}")
