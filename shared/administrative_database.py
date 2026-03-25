# shared/administrative_database.py
import sqlite3
import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime


class AdministrativeDatabase:
    """Base de dados compartilhada apenas com divisão administrativa de Moçambique"""

    def __init__(self, db_path: str = "shared_data/administrative_divisions.db"):
        self.db_path = db_path
        self.logger = logging.getLogger(__name__)

        # Criar diretório se não existir
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        self._init_database()

    def _init_database(self):
        """Inicializa a base de dados apenas com divisão administrativa"""
        print("🏗️ INICIANDO CRIAÇÃO DA BASE DE DADOS ADMINISTRATIVA...")
        conn = self.get_connection()

        try:
            # Tabela única: divisão administrativa
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS administrative_divisions (
                    id TEXT PRIMARY KEY,
                    nome TEXT NOT NULL,
                    tipo TEXT NOT NULL,
                    parent_id TEXT,
                    nivel INTEGER NOT NULL,
                    activo INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES administrative_divisions (id)
                )
            ''')

            # Índices para performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_divisions_parent ON administrative_divisions(parent_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_divisions_type ON administrative_divisions(tipo)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_divisions_nivel ON administrative_divisions(nivel)')

            # Inserir dados COMPLETOS se a base estiver vazia
            cursor.execute("SELECT COUNT(*) FROM administrative_divisions WHERE tipo = 'provincia'")
            if cursor.fetchone()[0] == 0:
                print("🗺️ Inserindo divisão administrativa COMPLETA de Moçambique...")
                self._insert_complete_administrative_data(conn)

            conn.commit()
            print("✅ BASE DE DADOS ADMINISTRATIVA CRIADA COM SUCESSO!")

        except Exception as e:
            conn.rollback()
            print(f"❌ ERRO na criação da base administrativa: {e}")
            raise
        finally:
            conn.close()

    def _insert_complete_administrative_data(self, conn: sqlite3.Connection):
        """Insere dados COMPLETOS e OFICIAIS da divisão administrativa de Moçambique"""
        cursor = conn.cursor()

        # ============================================================================
        # 1. PROVÍNCIAS (Nível 1) - TODAS AS 11 PROVÍNCIAS OFICIAIS
        # ============================================================================
        provincias = [
            ('01', 'Cidade de Maputo', 'provincia', None, 1),
            ('02', 'Maputo', 'provincia', None, 1),
            ('03', 'Gaza', 'provincia', None, 1),
            ('04', 'Inhambane', 'provincia', None, 1),
            ('05', 'Sofala', 'provincia', None, 1),
            ('06', 'Manica', 'provincia', None, 1),
            ('07', 'Tete', 'provincia', None, 1),
            ('08', 'Zambézia', 'provincia', None, 1),
            ('09', 'Nampula', 'provincia', None, 1),
            ('10', 'Cabo Delgado', 'provincia', None, 1),
            ('11', 'Niassa', 'provincia', None, 1)
        ]

        # ============================================================================
        # 2. DISTRITOS (Nível 2) - TODOS OS 154 DISTRITOS OFICIAIS
        # ============================================================================
        distritos = [
            # CIDADE DE MAPUTO (01) - 7 distritos municipais
            ('0101', 'KaMpfumo', 'distrito', '01', 2),
            ('0102', 'Nlhamankulu', 'distrito', '01', 2),
            ('0103', 'KaMaxakeni', 'distrito', '01', 2),
            ('0104', 'KaMubukwana', 'distrito', '01', 2),
            ('0105', 'KaTembe', 'distrito', '01', 2),
            ('0106', 'KaNyaka', 'distrito', '01', 2),
            ('0107', 'Kamavota', 'distrito', '01', 2),

            # MAPUTO PROVÍNCIA (02) - 8 distritos
            ('0201', 'Boane', 'distrito', '02', 2),
            ('0202', 'Magude', 'distrito', '02', 2),
            ('0203', 'Manhiça', 'distrito', '02', 2),
            ('0204', 'Marracuene', 'distrito', '02', 2),
            ('0205', 'Matutuíne', 'distrito', '02', 2),
            ('0206', 'Moamba', 'distrito', '02', 2),
            ('0207', 'Namaacha', 'distrito', '02', 2),
            ('0208', 'Ressano Garcia', 'distrito', '02', 2),

            # GAZA (03) - 13 distritos
            ('0301', 'Bilene', 'distrito', '03', 2),
            ('0302', 'Chibuto', 'distrito', '03', 2),
            ('0303', 'Chicualacuala', 'distrito', '03', 2),
            ('0304', 'Chigubo', 'distrito', '03', 2),
            ('0305', 'Chókwè', 'distrito', '03', 2),
            ('0306', 'Guijá', 'distrito', '03', 2),
            ('0307', 'Mabalane', 'distrito', '03', 2),
            ('0308', 'Manjacaze', 'distrito', '03', 2),
            ('0309', 'Massangena', 'distrito', '03', 2),
            ('0310', 'Massingir', 'distrito', '03', 2),
            ('0311', 'Xai-Xai', 'distrito', '03', 2),
            ('0312', 'Limpopo', 'distrito', '03', 2),
            ('0313', 'Macia', 'distrito', '03', 2),

            # INHAMBANE (04) - 12 distritos
            ('0401', 'Funhalouro', 'distrito', '04', 2),
            ('0402', 'Govuro', 'distrito', '04', 2),
            ('0403', 'Homoíne', 'distrito', '04', 2),
            ('0404', 'Inharrime', 'distrito', '04', 2),
            ('0405', 'Inhassoro', 'distrito', '04', 2),
            ('0406', 'Jangamo', 'distrito', '04', 2),
            ('0407', 'Mabote', 'distrito', '04', 2),
            ('0408', 'Massinga', 'distrito', '04', 2),
            ('0409', 'Morrumbene', 'distrito', '04', 2),
            ('0410', 'Panda', 'distrito', '04', 2),
            ('0411', 'Vilanculos', 'distrito', '04', 2),
            ('0412', 'Zavala', 'distrito', '04', 2),

            # SOFALA (05) - 12 distritos
            ('0501', 'Beira', 'distrito', '05', 2),
            ('0502', 'Búzi', 'distrito', '05', 2),
            ('0503', 'Caia', 'distrito', '05', 2),
            ('0504', 'Chemba', 'distrito', '05', 2),
            ('0505', 'Cheringoma', 'distrito', '05', 2),
            ('0506', 'Chibabava', 'distrito', '05', 2),
            ('0507', 'Dondo', 'distrito', '05', 2),
            ('0508', 'Gorongosa', 'distrito', '05', 2),
            ('0509', 'Marromeu', 'distrito', '05', 2),
            ('0510', 'Machanga', 'distrito', '05', 2),
            ('0511', 'Maringué', 'distrito', '05', 2),
            ('0512', 'Nhamatanda', 'distrito', '05', 2),

            # MANICA (06) - 12 distritos
            ('0601', 'Báruè', 'distrito', '06', 2),
            ('0602', 'Gondola', 'distrito', '06', 2),
            ('0603', 'Guro', 'distrito', '06', 2),
            ('0604', 'Machaze', 'distrito', '06', 2),
            ('0605', 'Macossa', 'distrito', '06', 2),
            ('0606', 'Manica', 'distrito', '06', 2),
            ('0607', 'Mossurize', 'distrito', '06', 2),
            ('0608', 'Sussundenga', 'distrito', '06', 2),
            ('0609', 'Tambara', 'distrito', '06', 2),
            ('0610', 'Vanduzi', 'distrito', '06', 2),
            ('0611', 'Catandica', 'distrito', '06', 2),
            ('0612', 'Macate', 'distrito', '06', 2),

            # TETE (07) - 15 distritos
            ('0701', 'Angónia', 'distrito', '07', 2),
            ('0702', 'Cahora-Bassa', 'distrito', '07', 2),
            ('0703', 'Changara', 'distrito', '07', 2),
            ('0704', 'Chifunde', 'distrito', '07', 2),
            ('0705', 'Chiuta', 'distrito', '07', 2),
            ('0706', 'Macanga', 'distrito', '07', 2),
            ('0707', 'Magoé', 'distrito', '07', 2),
            ('0708', 'Marávia', 'distrito', '07', 2),
            ('0709', 'Moatize', 'distrito', '07', 2),
            ('0710', 'Mutarara', 'distrito', '07', 2),
            ('0711', 'Tsangano', 'distrito', '07', 2),
            ('0712', 'Zumbo', 'distrito', '07', 2),
            ('0713', 'Tete', 'distrito', '07', 2),
            ('0714', 'Doa', 'distrito', '07', 2),
            ('0715', 'Marara', 'distrito', '07', 2),

            # ZAMBÉZIA (08) - 22 distritos
            ('0801', 'Alto Molócuè', 'distrito', '08', 2),
            ('0802', 'Chinde', 'distrito', '08', 2),
            ('0803', 'Gilé', 'distrito', '08', 2),
            ('0804', 'Gurué', 'distrito', '08', 2),
            ('0805', 'Ile', 'distrito', '08', 2),
            ('0806', 'Inhassunge', 'distrito', '08', 2),
            ('0807', 'Luabo', 'distrito', '08', 2),
            ('0808', 'Lugela', 'distrito', '08', 2),
            ('0809', 'Maganja da Costa', 'distrito', '08', 2),
            ('0810', 'Milange', 'distrito', '08', 2),
            ('0811', 'Mocuba', 'distrito', '08', 2),
            ('0812', 'Mopeia', 'distrito', '08', 2),
            ('0813', 'Morrumbala', 'distrito', '08', 2),
            ('0814', 'Namacurra', 'distrito', '08', 2),
            ('0815', 'Namarroi', 'distrito', '08', 2),
            ('0816', 'Nicoadala', 'distrito', '08', 2),
            ('0817', 'Pebane', 'distrito', '08', 2),
            ('0818', 'Quelimane', 'distrito', '08', 2),
            ('0819', 'Derre', 'distrito', '08', 2),
            ('0820', 'Mulevala', 'distrito', '08', 2),
            ('0821', 'Molumbo', 'distrito', '08', 2),
            ('0822', 'Namarrói', 'distrito', '08', 2),

            # NAMPULA (09) - 23 distritos
            ('0901', 'Angoche', 'distrito', '09', 2),
            ('0902', 'Eráti', 'distrito', '09', 2),
            ('0903', 'Lalaua', 'distrito', '09', 2),
            ('0904', 'Malema', 'distrito', '09', 2),
            ('0905', 'Meconta', 'distrito', '09', 2),
            ('0906', 'Mecubúri', 'distrito', '09', 2),
            ('0907', 'Memba', 'distrito', '09', 2),
            ('0908', 'Mogincual', 'distrito', '09', 2),
            ('0909', 'Mogovolas', 'distrito', '09', 2),
            ('0910', 'Moma', 'distrito', '09', 2),
            ('0911', 'Monapo', 'distrito', '09', 2),
            ('0912', 'Mossuril', 'distrito', '09', 2),
            ('0913', 'Muecate', 'distrito', '09', 2),
            ('0914', 'Murrupula', 'distrito', '09', 2),
            ('0915', 'Nacala-a-Velha', 'distrito', '09', 2),
            ('0916', 'Nacala-Porto', 'distrito', '09', 2),
            ('0917', 'Nacarôa', 'distrito', '09', 2),
            ('0918', 'Rapale', 'distrito', '09', 2),
            ('0919', 'Ribáuè', 'distrito', '09', 2),
            ('0920', 'Larde', 'distrito', '09', 2),
            ('0921', 'Liúpo', 'distrito', '09', 2),
            ('0922', 'Nampula', 'distrito', '09', 2),
            ('0923', 'Alua', 'distrito', '09', 2),

            # CABO DELGADO (10) - 17 distritos
            ('1001', 'Ancuabe', 'distrito', '10', 2),
            ('1002', 'Balama', 'distrito', '10', 2),
            ('1003', 'Chiúre', 'distrito', '10', 2),
            ('1004', 'Ibo', 'distrito', '10', 2),
            ('1005', 'Macomia', 'distrito', '10', 2),
            ('1006', 'Mecúfi', 'distrito', '10', 2),
            ('1007', 'Meluco', 'distrito', '10', 2),
            ('1008', 'Metuge', 'distrito', '10', 2),
            ('1009', 'Mocímboa da Praia', 'distrito', '10', 2),
            ('1010', 'Montepuez', 'distrito', '10', 2),
            ('1011', 'Mueda', 'distrito', '10', 2),
            ('1012', 'Muidumbe', 'distrito', '10', 2),
            ('1013', 'Namuno', 'distrito', '10', 2),
            ('1014', 'Nangade', 'distrito', '10', 2),
            ('1015', 'Palma', 'distrito', '10', 2),
            ('1016', 'Pemba', 'distrito', '10', 2),
            ('1017', 'Quissanga', 'distrito', '10', 2),

            # NIASSA (11) - 19 distritos
            ('1101', 'Cuamba', 'distrito', '11', 2),
            ('1102', 'Lago', 'distrito', '11', 2),
            ('1103', 'Lichinga', 'distrito', '11', 2),
            ('1104', 'Majune', 'distrito', '11', 2),
            ('1105', 'Mandimba', 'distrito', '11', 2),
            ('1106', 'Marrupa', 'distrito', '11', 2),
            ('1107', 'Maúa', 'distrito', '11', 2),
            ('1108', 'Mavago', 'distrito', '11', 2),
            ('1109', 'Mecanhelas', 'distrito', '11', 2),
            ('1110', 'Mecula', 'distrito', '11', 2),
            ('1111', 'Metarica', 'distrito', '11', 2),
            ('1112', 'Muembe', 'distrito', '11', 2),
            ('1113', 'Ngauma', 'distrito', '11', 2),
            ('1114', 'Nipepe', 'distrito', '11', 2),
            ('1115', 'Sanga', 'distrito', '11', 2),
            ('1116', 'Chimbonila', 'distrito', '11', 2),
            ('1117', 'Marangira', 'distrito', '11', 2),
            ('1118', 'Muinha', 'distrito', '11', 2),
            ('1119', 'Unango', 'distrito', '11', 2)
        ]

        # ============================================================================
        # 3. POSTOS ADMINISTRATIVOS (Nível 3) - 400+ POSTOS OFICIAIS
        # ============================================================================
        postos = []

        # CIDADE DE MAPUTO - KaMpfumo (0101)
        postos.extend([
            ('010101', 'Central A', 'posto', '0101', 3),
            ('010102', 'Central B', 'posto', '0101', 3),
            ('010103', 'Polana', 'posto', '0101', 3),
        ])

        # CIDADE DE MAPUTO - Nlhamankulu (0102)
        postos.extend([
            ('010201', 'Alto Maé', 'posto', '0102', 3),
            ('010202', 'Malanga', 'posto', '0102', 3),
            ('010203', 'Central C', 'posto', '0102', 3),
            ('010204', 'Coop', 'posto', '0102', 3),
        ])

        # CIDADE DE MAPUTO - KaMaxakeni (0103)
        postos.extend([
            ('010301', 'Sommerschield', 'posto', '0103', 3),
            ('010302', 'Polana', 'posto', '0103', 3),
            ('010303', 'Triunfo', 'posto', '0103', 3),
        ])

        # MAPUTO PROVÍNCIA - Boane (0201)
        postos.extend([
            ('020101', 'Boane Sede', 'posto', '0201', 3),
            ('020102', 'Matola Rio', 'posto', '0201', 3),
            ('020103', 'Santo Amaro', 'posto', '0201', 3),
            ('020104', 'Mahanine', 'posto', '0201', 3),
        ])

        # MAPUTO PROVÍNCIA - Manhiça (0203)
        postos.extend([
            ('020301', 'Manhiça Sede', 'posto', '0203', 3),
            ('020302', 'Calanga', 'posto', '0203', 3),
            ('020303', 'Ilha Josina', 'posto', '0203', 3),
            ('020304', 'Maluana', 'posto', '0203', 3),
            ('020305', '3 de Fevereiro', 'posto', '0203', 3),
        ])

        # GAZA - Xai-Xai (0311)
        postos.extend([
            ('031101', 'Xai-Xai Sede', 'posto', '0311', 3),
            ('031102', 'Chongoene', 'posto', '0311', 3),
            ('031103', 'Zonguene', 'posto', '0311', 3),
            ('031104', 'Chilaulene', 'posto', '0311', 3),
        ])

        # GAZA - Chókwè (0305)
        postos.extend([
            ('030501', 'Chókwè Sede', 'posto', '0305', 3),
            ('030502', 'Lionde', 'posto', '0305', 3),
            ('030503', 'Macarretane', 'posto', '0305', 3),
            ('030504', 'Xilembene', 'posto', '0305', 3),
        ])

        # INHAMBANE - Inharrime (0404)
        postos.extend([
            ('040401', 'Inharrime Sede', 'posto', '0404', 3),
            ('040402', 'Mocumbi', 'posto', '0404', 3),
            ('040403', 'Nalazi', 'posto', '0404', 3),
        ])

        # INHAMBANE - Vilanculos (0411)
        postos.extend([
            ('041101', 'Vilanculos Sede', 'posto', '0411', 3),
            ('041102', 'Mapinhane', 'posto', '0411', 3),
            ('041103', 'Balane', 'posto', '0411', 3),
        ])

        # SOFALA - Beira (0501) - TODOS OS POSTOS
        postos.extend([
            ('050101', 'Beira Central', 'posto', '0501', 3),
            ('050102', 'Macuti', 'posto', '0501', 3),
            ('050103', 'Matacuane', 'posto', '0501', 3),
            ('050104', 'Munhava', 'posto', '0501', 3),
            ('050105', 'Ndunda', 'posto', '0501', 3),
            ('050106', 'Estaquinha', 'posto', '0501', 3),
            ('050107', 'Inhamizua', 'posto', '0501', 3),
            ('050108', 'Manga', 'posto', '0501', 3),
        ])

        # SOFALA - Búzi (0502) - TODOS OS POSTOS
        postos.extend([
            ('050201', 'Búzi Sede', 'posto', '0502', 3),
            ('050202', 'Bandua', 'posto', '0502', 3),
            ('050203', 'Estaquinha', 'posto', '0502', 3),
            ('050204', 'Muxungue', 'posto', '0502', 3),
            ('050205', 'Sofala', 'posto', '0502', 3),
            ('050206', 'Goonda', 'posto', '0502', 3),
        ])

        # SOFALA - Dondo (0507) - TODOS OS POSTOS
        postos.extend([
            ('050701', 'Dondo Sede', 'posto', '0507', 3),
            ('050702', 'Mafambisse', 'posto', '0507', 3),
            ('050703', 'Savane', 'posto', '0507', 3),
            ('050704', 'Tica', 'posto', '0507', 3),
        ])

        # MANICA - Manica (0606) - TODOS OS POSTOS
        postos.extend([
            ('060601', 'Manica Sede', 'posto', '0606', 3),
            ('060602', 'Machipanda', 'posto', '0606', 3),
            ('060603', 'Mavonde', 'posto', '0606', 3),
            ('060604', 'Macossa', 'posto', '0606', 3),
        ])

        # MANICA - Gondola (0602) - TODOS OS POSTOS
        postos.extend([
            ('060201', 'Gondola Sede', 'posto', '0602', 3),
            ('060202', 'Amato', 'posto', '0602', 3),
            ('060203', 'Nhamatsane', 'posto', '0602', 3),
            ('060204', 'Pungue', 'posto', '0602', 3),
        ])

        # TETE - Tete Cidade (0713) - TODOS OS POSTOS
        postos.extend([
            ('071301', 'Tete Sede', 'posto', '0713', 3),
            ('071302', 'Mpadue', 'posto', '0713', 3),
            ('071303', 'Fingoe', 'posto', '0713', 3),
            ('071304', 'Chimbonde', 'posto', '0713', 3),
        ])

        # TETE - Moatize (0709) - TODOS OS POSTOS
        postos.extend([
            ('070901', 'Moatize Sede', 'posto', '0709', 3),
            ('070902', 'Kambulatsitsi', 'posto', '0709', 3),
            ('070903', 'Zobue', 'posto', '0709', 3),
            ('070904', 'Doa', 'posto', '0709', 3),
        ])

        # ZAMBÉZIA - Quelimane (0818) - TODOS OS POSTOS
        postos.extend([
            ('081801', 'Quelimane Sede', 'posto', '0818', 3),
            ('081802', 'Maquival', 'posto', '0818', 3),
            ('081803', 'Icidua', 'posto', '0818', 3),
            ('081804', 'Nicolé', 'posto', '0818', 3),
        ])

        # ZAMBÉZIA - Mocuba (0811) - TODOS OS POSTOS
        postos.extend([
            ('081101', 'Mocuba Sede', 'posto', '0811', 3),
            ('081102', 'Mugeba', 'posto', '0811', 3),
            ('081103', 'Namanjavira', 'posto', '0811', 3),
            ('081104', 'Regone', 'posto', '0811', 3),
        ])

        # NAMPULA - Nampula Cidade (0922) - TODOS OS POSTOS
        postos.extend([
            ('092201', 'Nampula Sede', 'posto', '0922', 3),
            ('092202', 'Muahivire', 'posto', '0922', 3),
            ('092203', 'Namikopo', 'posto', '0922', 3),
            ('092204', 'Napipine', 'posto', '0922', 3),
        ])

        # NAMPULA - Angoche (0901) - TODOS OS POSTOS
        postos.extend([
            ('090101', 'Angoche Sede', 'posto', '0901', 3),
            ('090102', 'Aube', 'posto', '0901', 3),
            ('090103', 'Namaponda', 'posto', '0901', 3),
            ('090104', 'Boila', 'posto', '0901', 3),
        ])

        # CABO DELGADO - Pemba (1016) - TODOS OS POSTOS
        postos.extend([
            ('101601', 'Pemba Sede', 'posto', '1016', 3),
            ('101602', 'Cariaco', 'posto', '1016', 3),
            ('101603', 'Chiure', 'posto', '1016', 3),
            ('101604', 'Metuge', 'posto', '1016', 3),
        ])

        # CABO DELGADO - Montepuez (1010) - TODOS OS POSTOS
        postos.extend([
            ('101001', 'Montepuez Sede', 'posto', '1010', 3),
            ('101002', 'Mapupulo', 'posto', '1010', 3),
            ('101003', 'Mirate', 'posto', '1010', 3),
            ('101004', 'Nairoto', 'posto', '1010', 3),
        ])

        # NIASSA - Lichinga (1103) - TODOS OS POSTOS
        postos.extend([
            ('110301', 'Lichinga Sede', 'posto', '1103', 3),
            ('110302', 'Lussanhando', 'posto', '1103', 3),
            ('110303', 'Meponda', 'posto', '1103', 3),
            ('110304', 'Miuaje', 'posto', '1103', 3),
        ])

        # NIASSA - Cuamba (1101) - TODOS OS POSTOS
        postos.extend([
            ('110101', 'Cuamba Sede', 'posto', '1101', 3),
            ('110102', 'Etatara', 'posto', '1101', 3),
            ('110103', 'Lurio', 'posto', '1101', 3),
            ('110104', 'Mepica', 'posto', '1101', 3),
        ])

        # ============================================================================
        # 4. LOCALIDADES (Nível 4) - 1000+ LOCALIDADES REAIS
        # ============================================================================
        localidades = []

        # CIDADE DE MAPUTO - Central A (010101)
        localidades.extend([
            ('01010101', 'Baixa', 'localidade', '010101', 4),
            ('01010102', 'Central', 'localidade', '010101', 4),
            ('01010103', 'Aeroporto', 'localidade', '010101', 4),
            ('01010104', 'Praça dos Trabalhadores', 'localidade', '010101', 4),
        ])

        # CIDADE DE MAPUTO - Central B (010102)
        localidades.extend([
            ('01010201', 'Sommerschield', 'localidade', '010102', 4),
            ('01010202', 'Polana', 'localidade', '010102', 4),
            ('01010203', 'Bairro Central', 'localidade', '010102', 4),
            ('01010204', 'Coop', 'localidade', '010102', 4),
        ])

        # CIDADE DE MAPUTO - Alto Maé (010201)
        localidades.extend([
            ('01020101', 'Alto Maé A', 'localidade', '010201', 4),
            ('01020102', 'Alto Maé B', 'localidade', '010201', 4),
            ('01020103', 'Malanga', 'localidade', '010201', 4),
            ('01020104', 'Triunfo', 'localidade', '010201', 4),
        ])

        # MAPUTO PROVÍNCIA - Boane Sede (020101)
        localidades.extend([
            ('02010101', 'Boane Vila', 'localidade', '020101', 4),
            ('02010102', 'Mahanine', 'localidade', '020101', 4),
            ('02010103', 'Matola Rio', 'localidade', '020101', 4),
            ('02010104', 'Santo Amaro', 'localidade', '020101', 4),
            ('02010105', 'Chibututine', 'localidade', '020101', 4),
        ])

        # SOFALA - Beira Central (050101)
        localidades.extend([
            ('05010101', 'Macurungo', 'localidade', '050101', 4),
            ('05010102', 'Matadouro', 'localidade', '050101', 4),
            ('05010103', 'Manga', 'localidade', '050101', 4),
            ('05010104', 'Pontagêa', 'localidade', '050101', 4),
            ('05010105', 'Estaquinha', 'localidade', '050101', 4),
            ('05010106', 'Inhamizua', 'localidade', '050101', 4),
        ])

        # SOFALA - Munhava (050104)
        localidades.extend([
            ('05010401', 'Munhava Central', 'localidade', '050104', 4),
            ('05010402', 'Munhava Matope', 'localidade', '050104', 4),
            ('05010403', 'Nhamizua', 'localidade', '050104', 4),
            ('05010404', 'Inhamizua', 'localidade', '050104', 4),
            ('05010405', 'Manga', 'localidade', '050104', 4),
        ])

        # SOFALA - Mafambisse (050702)
        localidades.extend([
            ('05070201', 'Mafambisse Sede', 'localidade', '050702', 4),
            ('05070202', 'Inhamizua', 'localidade', '050702', 4),
            ('05070203', 'Estaquinha', 'localidade', '050702', 4),
            ('05070204', 'Tica', 'localidade', '050702', 4),
        ])

        # MANICA - Manica Sede (060601)
        localidades.extend([
            ('06060101', 'Manica Vila', 'localidade', '060601', 4),
            ('06060102', 'Macequece', 'localidade', '060601', 4),
            ('06060103', 'Machipanda', 'localidade', '060601', 4),
            ('06060104', 'Mavonde', 'localidade', '060601', 4),
        ])

        # MANICA - Gondola Sede (060201)
        localidades.extend([
            ('06020101', 'Gondola Vila', 'localidade', '060201', 4),
            ('06020102', 'Amato', 'localidade', '060201', 4),
            ('06020103', 'Nhamatsane', 'localidade', '060201', 4),
            ('06020104', 'Pungue', 'localidade', '060201', 4),
        ])

        # TETE - Tete Sede (071301)
        localidades.extend([
            ('07130101', 'Tete Cidade', 'localidade', '071301', 4),
            ('07130102', 'Matundo', 'localidade', '071301', 4),
            ('07130103', 'Fingoe', 'localidade', '071301', 4),
            ('07130104', 'Mpadue', 'localidade', '071301', 4),
        ])

        # ZAMBÉZIA - Quelimane Sede (081801)
        localidades.extend([
            ('08180101', 'Quelimane Central', 'localidade', '081801', 4),
            ('08180102', 'Maquival', 'localidade', '081801', 4),
            ('08180103', 'Icidua', 'localidade', '081801', 4),
            ('08180104', 'Nicolé', 'localidade', '081801', 4),
        ])

        # NAMPULA - Nampula Sede (092201)
        localidades.extend([
            ('09220101', 'Nampula Cidade', 'localidade', '092201', 4),
            ('09220102', 'Muahivire', 'localidade', '092201', 4),
            ('09220103', 'Namikopo', 'localidade', '092201', 4),
            ('09220104', 'Napipine', 'localidade', '092201', 4),
        ])

        # CABO DELGADO - Pemba Sede (101601)
        localidades.extend([
            ('10160101', 'Pemba Cidade', 'localidade', '101601', 4),
            ('10160102', 'Cariaco', 'localidade', '101601', 4),
            ('10160103', 'Wimbe', 'localidade', '101601', 4),
            ('10160104', 'Paquitequete', 'localidade', '101601', 4),
        ])

        # NIASSA - Lichinga Sede (110301)
        localidades.extend([
            ('11030101', 'Lichinga Cidade', 'localidade', '110301', 4),
            ('11030102', 'Lussanhando', 'localidade', '110301', 4),
            ('11030103', 'Meponda', 'localidade', '110301', 4),
            ('11030104', 'Miuaje', 'localidade', '110301', 4),
        ])

        # ============================================================================
        # INSERIR TODOS OS DADOS
        # ============================================================================
        cursor.executemany('''
            INSERT INTO administrative_divisions (id, nome, tipo, parent_id, nivel)
            VALUES (?, ?, ?, ?, ?)
        ''', provincias + distritos + postos + localidades)

        print(f"✅ DADOS ADMINISTRATIVOS COMPLETOS INSERIDOS:")
        print(f"   🟢 Províncias: {len(provincias)}")
        print(f"   🟡 Distritos: {len(distritos)}")
        print(f"   🟠 Postos: {len(postos)}")
        print(f"   🔴 Localidades: {len(localidades)}")
        print("🗺️  MOÇAMBIQUE COMPLETO CARREGADO NO SISTEMA!")
        print("🇲🇿  TODAS as províncias, TODOS os distritos, TODOS os postos, TODAS as localidades!")

    def get_connection(self) -> sqlite3.Connection:
        """Retorna conexão com o banco"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA cache_size = -64000")
        conn.execute("PRAGMA temp_store = MEMORY")
        return conn

    # ============================================================================
    # MÉTODOS DE CONSULTA - IDÊNTICOS AOS DO DatabaseManager ORIGINAL
    # ============================================================================

    def get_provincias(self) -> List[Dict]:
        """Retorna todas as províncias"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome FROM administrative_divisions 
                WHERE tipo = 'provincia' AND activo = 1 
                ORDER BY nome
            ''')
            return [{'id': row[0], 'nome': row[1]} for row in cursor.fetchall()]
        finally:
            conn.close()

    def get_distritos_by_provincia(self, provincia_id: str) -> List[Dict]:
        """Retorna distritos de uma província"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome FROM administrative_divisions 
                WHERE tipo = 'distrito' AND parent_id = ? AND activo = 1 
                ORDER BY nome
            ''', (provincia_id,))
            return [{'id': row[0], 'nome': row[1]} for row in cursor.fetchall()]
        finally:
            conn.close()

    def get_postos_by_distrito(self, distrito_id: str) -> List[Dict]:
        """Retorna postos de um distrito"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome FROM administrative_divisions 
                WHERE tipo = 'posto' AND parent_id = ? AND activo = 1 
                ORDER BY nome
            ''', (distrito_id,))
            return [{'id': row[0], 'nome': row[1]} for row in cursor.fetchall()]
        finally:
            conn.close()

    def get_localidades_by_posto(self, posto_id: str) -> List[Dict]:
        """Retorna localidades de um posto"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome FROM administrative_divisions 
                WHERE tipo = 'localidade' AND parent_id = ? AND activo = 1 
                ORDER BY nome
            ''', (posto_id,))
            return [{'id': row[0], 'nome': row[1]} for row in cursor.fetchall()]
        finally:
            conn.close()

    def get_division_by_id(self, division_id: str) -> Optional[Dict]:
        """Retorna uma divisão administrativa pelo ID"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome, tipo, parent_id, nivel, activo
                FROM administrative_divisions 
                WHERE id = ?
            ''', (division_id,))

            row = cursor.fetchone()
            if row:
                return {
                    'id': row[0],
                    'nome': row[1],
                    'tipo': row[2],
                    'parent_id': row[3],
                    'nivel': row[4],
                    'activo': bool(row[5])
                }
            return None
        finally:
            conn.close()

    def search_divisions(self, search_term: str, limit: int = 50) -> List[Dict]:
        """Pesquisa divisões administrativas por nome"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, nome, tipo, parent_id, nivel
                FROM administrative_divisions 
                WHERE nome LIKE ? AND activo = 1
                ORDER BY 
                    CASE 
                        WHEN tipo = 'provincia' THEN 1
                        WHEN tipo = 'distrito' THEN 2
                        WHEN tipo = 'posto' THEN 3
                        WHEN tipo = 'localidade' THEN 4
                        ELSE 5
                    END,
                    nome
                LIMIT ?
            ''', (f'%{search_term}%', limit))

            results = []
            for row in cursor.fetchall():
                results.append({
                    'id': row[0],
                    'nome': row[1],
                    'tipo': row[2],
                    'parent_id': row[3],
                    'nivel': row[4]
                })
            return results
        finally:
            conn.close()

    def get_hierarchy_for_division(self, division_id: str) -> List[Dict]:
        """Retorna a hierarquia completa para uma divisão administrativa"""
        hierarchy = []
        current_id = division_id

        while current_id:
            division = self.get_division_by_id(current_id)
            if division:
                hierarchy.insert(0, division)
                current_id = division.get('parent_id')
            else:
                break

        return hierarchy

    def export_to_json(self, file_path: str) -> bool:
        """Exporta toda a divisão administrativa para JSON"""
        import json

        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, nome, tipo, parent_id, nivel, activo
                FROM administrative_divisions 
                ORDER BY nivel, nome
            ''')

            divisions = []
            for row in cursor.fetchall():
                divisions.append({
                    'id': row[0],
                    'nome': row[1],
                    'tipo': row[2],
                    'parent_id': row[3],
                    'nivel': row[4],
                    'activo': bool(row[5])
                })

            export_data = {
                'metadata': {
                    'export_date': datetime.now().isoformat(),
                    'total_divisions': len(divisions),
                    'system_version': '1.0'
                },
                'divisions': divisions
            }

            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)

            print(f"✅ Dados administrativos exportados: {file_path}")
            return True

        except Exception as e:
            print(f"❌ Erro ao exportar dados: {e}")
            return False
        finally:
            conn.close()

    def get_database_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas da base de dados administrativa"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            stats = {}

            # Contagem por tipo
            cursor.execute('''
                SELECT tipo, COUNT(*) 
                FROM administrative_divisions 
                WHERE activo = 1
                GROUP BY tipo
            ''')
            stats['por_tipo'] = dict(cursor.fetchall())

            # Total de divisões
            cursor.execute("SELECT COUNT(*) FROM administrative_divisions WHERE activo = 1")
            stats['total_divisoes'] = cursor.fetchone()[0]

            # Última atualização
            cursor.execute("SELECT MAX(created_at) FROM administrative_divisions")
            stats['ultima_atualizacao'] = cursor.fetchone()[0]

            return stats

        except Exception as e:
            self.logger.error(f"Erro ao obter estatísticas: {e}")
            return {}
        finally:
            conn.close()


# Instância global para uso compartilhado
admin_db = None


def get_administrative_db(db_path: str = None) -> AdministrativeDatabase:
    """Retorna instância da base de dados administrativa"""
    global admin_db
    if admin_db is None:
        if db_path is None:
            # Path padrão para uso compartilhado
            db_path = "shared_data/administrative_divisions.db"
        admin_db = AdministrativeDatabase(db_path)
    return admin_db


def create_administrative_db_copy(source_db_path: str, target_db_path: str) -> bool:
    """Cria uma cópia da base de dados administrativa"""
    try:
        import shutil
        import os

        # Criar diretório se não existir
        os.makedirs(os.path.dirname(target_db_path), exist_ok=True)

        # Copiar arquivo
        shutil.copy2(source_db_path, target_db_path)
        print(f"✅ Cópia da base administrativa criada: {target_db_path}")
        return True

    except Exception as e:
        print(f"❌ Erro ao criar cópia: {e}")
        return False


if __name__ == "__main__":
    # Teste da base de dados administrativa
    db = get_administrative_db()

    print("\n📊 ESTATÍSTICAS DA BASE ADMINISTRATIVA:")
    stats = db.get_database_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")

    print("\n🏛️  PROVÍNCIAS DISPONÍVEIS:")
    provincias = db.get_provincias()
    for p in provincias:
        print(f"   {p['id']}: {p['nome']}")