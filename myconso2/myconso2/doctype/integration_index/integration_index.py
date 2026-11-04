import re
from datetime import date, datetime, time, timedelta

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_site_path

_DATE_HINTS = ('date', 'jour', 'releve', 'relevé')
_HEURE_HINTS = ('heure', 'hour', 'time')
_INDEX_HINTS = ('index', 'compteur', 'valeur', 'releve', 'relevé', 'kwh')


class IntegrationIndex(Document):
	# ── Actions boutons ─────────────────────────────────────────────────
	@frappe.whitelist()
	def analyser(self):
		rows = self._lire_fichier()
		self.lignes = []
		stats = dict(nb_lignes=len(rows), nb_valides=0, nb_doublons=0, nb_erreurs=0, nb_avertissements=0)

		seen = set()
		parsed = []
		for r in rows:
			item = {'ligne': r['ligne'], 'date_index': None, 'heure_index': None, 'valeur_index': None,
			        'statut': 'Valide', 'message': ''}
			try:
				item['date_index'] = _parse_date(r['date'])
				item['heure_index'] = _parse_heure(r.get('heure'), r['date'], self.heure_defaut)
				item['valeur_index'] = _parse_nombre(r['index'])
			except ValueError as e:
				item['statut'], item['message'] = 'Erreur', str(e)
			parsed.append(item)

		# Doublons (dans le fichier et en base)
		for it in parsed:
			if it['statut'] != 'Valide':
				continue
			key = (it['date_index'], it['heure_index'], it['valeur_index'])
			if self.ignorer_doublons and key in seen:
				it['statut'], it['message'] = 'Doublon', _('Doublon dans le fichier')
			elif self.ignorer_doublons and frappe.db.exists('Index Conso', {
					'date_index': it['date_index'], 'heure_index': it['heure_index'],
					'valeur_index': it['valeur_index']}):
				it['statut'], it['message'] = 'Doublon', _('Déjà présent dans Index Conso')
			seen.add(key)

		# Cohérence chronologique : l'index d'un compteur ne devrait pas baisser
		ok = sorted([i for i in parsed if i['statut'] == 'Valide'],
		            key=lambda i: (i['date_index'], i['heure_index']))
		prev = None
		for it in ok:
			if prev is not None and it['valeur_index'] < prev['valeur_index']:
				it['statut'] = 'Avertissement'
				it['message'] = _("Index inférieur au précédent ({0} le {1})").format(
					prev['valeur_index'], prev['date_index'])
			prev = it

		for it in parsed:
			s = it['statut']
			stats['nb_valides'] += s == 'Valide'
			stats['nb_doublons'] += s == 'Doublon'
			stats['nb_erreurs'] += s == 'Erreur'
			stats['nb_avertissements'] += s == 'Avertissement'
			self.append('lignes', it)

		self.update(stats)
		self.nb_importes = 0
		self.statut = 'Analysé'
		self.save()
		frappe.msgprint(_("Analyse terminée : {0} valide(s), {1} avertissement(s), {2} doublon(s), {3} erreur(s).").format(
			stats['nb_valides'], stats['nb_avertissements'], stats['nb_doublons'], stats['nb_erreurs']))

	@frappe.whitelist()
	def importer(self):
		if self.statut not in ('Analysé', 'Importé partiellement'):
			frappe.throw(_("Analysez le fichier avant l'import."))
		nb = 0
		for l in self.lignes:
			if l.statut not in ('Valide', 'Avertissement'):
				continue
			try:
				frappe.get_doc({
					'doctype': 'Index Conso',
					'valeur_index': l.valeur_index,
					'date_index': l.date_index,
					'heure_index': l.heure_index,
				}).insert(ignore_permissions=True)
				l.statut, l.message = 'Importé', ''
				nb += 1
			except Exception as e:
				l.statut, l.message = 'Erreur', str(e)[:140]
		self.nb_importes = (self.nb_importes or 0) + nb
		self.nb_valides = sum(1 for l in self.lignes if l.statut == 'Valide')
		self.nb_avertissements = sum(1 for l in self.lignes if l.statut == 'Avertissement')
		self.nb_erreurs = sum(1 for l in self.lignes if l.statut == 'Erreur')
		self.statut = 'Importé' if not self.nb_erreurs else 'Importé partiellement'
		self.save()
		frappe.msgprint(_("{0} index importé(s) dans Index Conso.").format(nb))

	# ── Lecture du fichier ──────────────────────────────────────────────
	def _chemin_fichier(self):
		f = frappe.get_doc('File', {'file_url': self.fichier})
		return f.get_full_path()

	def _lire_fichier(self):
		if not self.fichier:
			frappe.throw(_("Aucun fichier joint."))
		path = self._chemin_fichier()
		if self.fichier.lower().endswith('.xls'):
			grid = _grille_xls(path, self.feuille)
		elif self.fichier.lower().endswith(('.xlsx', '.xlsm')):
			grid = _grille_xlsx(path, self.feuille)
		else:
			frappe.throw(_("Format non supporté : utilisez un fichier .xls ou .xlsx."))

		h = max(1, int(self.ligne_entete or 1)) - 1
		if len(grid) <= h:
			frappe.throw(_("Le fichier ne contient pas de données après la ligne d'en-tête."))
		entetes = [str(c or '').strip() for c in grid[h]]

		i_date = _trouve_col(entetes, self.col_date, _DATE_HINTS, "Date")
		i_index = _trouve_col(entetes, self.col_index, _INDEX_HINTS, "Index", exclude={i_date})
		i_heure = _trouve_col(entetes, self.col_heure, _HEURE_HINTS, "Heure", required=bool(self.col_heure))

		# Mémorise ce qui a été détecté pour que l'utilisateur le voie
		self.col_date, self.col_index = entetes[i_date], entetes[i_index]
		if i_heure is not None:
			self.col_heure = entetes[i_heure]

		rows = []
		for n, row in enumerate(grid[h + 1:], start=h + 2):
			if not any(c not in (None, '') for c in row):
				continue
			get = lambda i: row[i] if i is not None and i < len(row) else None
			rows.append({'ligne': n, 'date': get(i_date), 'index': get(i_index),
			             'heure': get(i_heure) if i_heure is not None else None})
		if not rows:
			frappe.throw(_("Aucune ligne de données trouvée."))
		return rows


# ── Helpers ─────────────────────────────────────────────────────────────
def _grille_xlsx(path, feuille):
	import openpyxl
	wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
	ws = wb[feuille] if feuille else wb.worksheets[0]
	return [list(r) for r in ws.iter_rows(values_only=True)]


def _grille_xls(path, feuille):
	import xlrd
	wb = xlrd.open_workbook(path)
	sh = wb.sheet_by_name(feuille) if feuille else wb.sheet_by_index(0)
	grid = []
	for r in range(sh.nrows):
		row = []
		for c in range(sh.ncols):
			cell = sh.cell(r, c)
			v = cell.value
			if cell.ctype == xlrd.XL_CELL_DATE:
				v = xlrd.xldate.xldate_as_datetime(v, wb.datemode)
			elif cell.ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK):
				v = None
			row.append(v)
		grid.append(row)
	return grid


def _trouve_col(entetes, choisi, hints, nom, exclude=(), required=True):
	norm = [e.lower() for e in entetes]
	if choisi:
		c = choisi.strip().lower()
		if c in norm:
			return norm.index(c)
		frappe.throw(_("Colonne « {0} » introuvable dans le fichier. Colonnes disponibles : {1}").format(
			choisi, ', '.join(e for e in entetes if e)))
	for i, e in enumerate(norm):
		if i not in exclude and any(h in e for h in hints):
			return i
	if required:
		frappe.throw(_("Impossible de détecter la colonne « {0} ». Renseignez-la dans « Correspondance des colonnes ». "
		               "Colonnes disponibles : {1}").format(nom, ', '.join(e for e in entetes if e)))
	return None


def _parse_date(v):
	if isinstance(v, datetime):
		return v.date()
	if isinstance(v, date):
		return v
	if isinstance(v, (int, float)) and 20000 < v < 80000:  # numéro de série Excel
		return (datetime(1899, 12, 30) + timedelta(days=v)).date()
	s = str(v or '').strip()
	if not s:
		raise ValueError(_("Date manquante"))
	for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%Y-%m-%d', '%d/%m/%y', '%Y/%m/%d',
	            '%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M', '%Y-%m-%d %H:%M:%S'):
		try:
			return datetime.strptime(s, fmt).date()
		except ValueError:
			pass
	raise ValueError(_("Date illisible : {0}").format(s))


def _parse_heure(h, date_cell, defaut):
	if isinstance(h, datetime):
		return h.time().replace(microsecond=0)
	if isinstance(h, time):
		return h.replace(microsecond=0)
	if isinstance(h, (int, float)) and 0 <= h < 1:
		sec = round(h * 86400)
		return (datetime.min + timedelta(seconds=sec)).time()
	if h not in (None, ''):
		m = re.match(r'^\s*(\d{1,2})\s*[:hH]\s*(\d{1,2})?(?:\s*:\s*(\d{1,2}))?', str(h))
		if not m:
			raise ValueError(_("Heure illisible : {0}").format(h))
		return time(int(m.group(1)) % 24, int(m.group(2) or 0), int(m.group(3) or 0))
	# Pas de colonne heure : heure éventuellement portée par la cellule date
	if isinstance(date_cell, datetime) and date_cell.time() != time(0, 0):
		return date_cell.time().replace(microsecond=0)
	if isinstance(defaut, timedelta):
		return (datetime.min + defaut).time()
	if isinstance(defaut, time):
		return defaut
	if defaut:
		return datetime.strptime(str(defaut), '%H:%M:%S').time()
	return time(0, 0)


def _parse_nombre(v):
	if isinstance(v, bool) or v in (None, ''):
		raise ValueError(_("Index manquant"))
	if isinstance(v, (int, float)):
		return float(v)
	s = re.sub(r'[\s ]', '', str(v)).replace(',', '.')
	try:
		return float(s)
	except ValueError:
		raise ValueError(_("Index illisible : {0}").format(v))
