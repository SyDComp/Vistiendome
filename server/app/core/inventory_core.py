import barcode
from barcode.writer import ImageWriter
import os
import random
import string
from typing import Dict, List

# Carpeta para guardar códigos de barras temporales (o persistentes)
BARCODE_DIR = "media/barcodes"

def generate_sku_id(category_name: str, product_name: str, options: dict) -> str:
    """
    Genera un SKU alfanumérico basado en el tipo de producto y sus variantes.
    Usa una lógica de abreviatura inteligente por palabra y filtra conectores.
    """
    def abbreviate(text: str) -> str:
        if not text: return ""
        # Limpiar y separar por palabras
        clean_text = "".join(c for c in str(text).upper() if c.isalnum() or c.isspace())
        words = [w for w in clean_text.split() if w not in ['DE', 'LA', 'EL', 'EN', 'Y', 'CON', 'POR', 'PARA', 'UN', 'UNA', 'A', 'DAS', 'LOS', 'LAS']]
        
        if not words: return clean_text[:3] # Fallback
        
        if len(words) == 1:
            return words[0][:5]
        
        # 2+ palabras: Tomamos 3 de cada una
        return "_".join(w[:3] for w in words)

    cat_prefix = abbreviate(category_name)[:3]
    prod_name_clean = abbreviate(product_name)[:10]
    
    # Variante suffix: Procesamos cada valor de la configuración
    variant_parts = [abbreviate(val) for val in options.values()]
    variant_suffix = "-".join(variant_parts)
    
    sku = f"{cat_prefix}-{prod_name_clean}"
    if variant_suffix:
        sku += f"-{variant_suffix}"
    
    # LIMPIEZA FINAL: Asegurar que no existan espacios en el código técnico
    return sku.replace(" ", "_").strip("_")

def generate_barcode_eAN13(sku_text: str = "") -> str:
    """Genera un EAN13 determinista basado en el SKU (hash de 32 bits)"""
    if not sku_text:
        return "".join(random.choices(string.digits, k=13))
        
    hash_val = 0
    for char in sku_text:
        hash_val = ((hash_val << 5) - hash_val) + ord(char)
        hash_val = hash_val & 0xFFFFFFFF # Force 32-bit int
        
    # Python integers can be larger, but we simulate the JS 32-bit behavior
    # Handle JS bitwise negative wrap-around
    if hash_val > 0x7FFFFFFF:
        hash_val -= 0x100000000
        
    hash_str = str(abs(hash_val)).zfill(12)
    while len(hash_str) < 12:
        hash_str += hash_str
    hash_str = hash_str[:12]
    
    sum_val = 0
    for i in range(12):
        sum_val += int(hash_str[i]) * (1 if i % 2 == 0 else 3)
        
    checksum = (10 - (sum_val % 10)) % 10
    return hash_str + str(checksum)

def create_barcode_image(code: str, filename: str) -> str:
    """
    Genera una imagen Code 128 (alfanumérico) para un SKU dado.
    Retorna la ruta relativa del archivo.
    """
    if not os.path.exists(BARCODE_DIR):
        os.makedirs(BARCODE_DIR)
        
    CODE128 = barcode.get_barcode_class('code128')
    bar = CODE128(code, writer=ImageWriter())
    
    # El archivo se guarda sin extensión en el método save, ImageWriter añade .png
    file_path = os.path.join(BARCODE_DIR, filename)
    saved_path = bar.save(file_path)
    
    # Retornar ruta relativa para el frontend
    return f"/media/barcodes/{filename}.png"

def generate_variant_matrix(attributes: List[Dict]) -> List[Dict]:
    """
    Recibe una lista de atributos con sus valores permitidos y genera el producto cartesiano.
    Input: [{"name": "Talla", "values": ["S", "M"]}, {"name": "Color", "values": ["Rojo"]}]
    Output: [{"Talla": "S", "Color": "Rojo"}, {"Talla": "M", "Color": "Rojo"}]
    """
    import itertools
    
    # Extraer nombres y listas de valores (Asegurando unicidad local en cada dimensión)
    keys = [attr['name'] for attr in attributes]
    value_lists = [list(dict.fromkeys(attr['values'])) for attr in attributes]
    
    combinations = list(itertools.product(*value_lists))
    
    matrix = []
    for combo in combinations:
        matrix.append(dict(zip(keys, combo)))
        
    return matrix
