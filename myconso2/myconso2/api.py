import frappe
from frappe import _
import json
import calendar as cal_mod
from datetime import date as _dt

# ── Constantes CIE (réglementaires — non configurables) ──────────────────────
_CIE_TVA        = 0.18   # TVA 18 %
_CIE_CO2_FACTOR = 0.27   # kg CO₂/kWh — réseau ivoirien

# Barème tarifaire CIE par code d'abonnement (tarifs officiels HT FCFA)
_CIE_TARIFS = {
    'code01': {  # Domestique Modéré (Social 5A)
        'nom': 'Domestique Modéré',
        't1': 57.43, 't2': 47.96,
        'prime_fixe_kva': 0,
        'prime_fixe_forfait': 614.90,  # FCFA HT bimestriel (forfait fixe)
        't1_limit_base': 80,           # kWh/mois, indépendant du kVA
    },
    'code02': {  # Domestique Général
        'nom': 'Domestique Général',
        't1': 57.43, 't2': 47.96,
        'prime_fixe_kva': 1246.56,
        'prime_fixe_forfait': 0,
        't1_limit_base': 180,          # kWh/kVA/bimestre
    },
    'code03': {  # Général Professionnel
        'nom': 'Général Professionnel',
        't1': 86.31, 't2': 86.31,
        'prime_fixe_kva': 1552.10,
        'prime_fixe_forfait': 0,
        't1_limit_base': 180,
    },
    'code04': {  # Eclairage Public
        'nom': 'Eclairage Public',
        't1': 73.41, 't2': 73.41,
        'prime_fixe_kva': 0,
        'prime_fixe_forfait': 0,
        't1_limit_base': 180,
    },
    'code05': {  # Conventionnel ex-EECI
        'nom': 'Conventionnel',
        't1': 80.0, 't2': 80.0,
        'prime_fixe_kva': 1400,
        'prime_fixe_forfait': 0,
        't1_limit_base': 180,
    },
    'code17': {  # Domestique Général 5A
        'nom': 'Domestique Général 5A',
        't1': 57.43, 't2': 47.96,
        'prime_fixe_kva': 1246.56,
        'prime_fixe_forfait': 0,
        't1_limit_base': 180,
    },
}
_DEFAULT_TARIF = _CIE_TARIFS['code02']


def _detect_code(type_abo):
    """Retourne la clé de tarif (code01..code17) selon le libellé d'abonnement."""
    t = (type_abo or '').lower()
    if 'code 01' in t or 'code01' in t:
        return 'code01'
    if 'code 03' in t or 'code03' in t:
        return 'code03'
    if 'code 04' in t or 'code04' in t:
        return 'code04'
    if 'code 05' in t or 'code05' in t:
        return 'code05'
    if 'code 17' in t or 'code17' in t:
        return 'code17'
    return 'code02'  # défaut : Domestique Général


@frappe.whitelist()
def get_tarif_by_code(type_abonnement):
    """Retourne les paramètres tarifaires pour un code CIE donné."""
    code  = _detect_code(type_abonnement)
    tarif = _CIE_TARIFS.get(code, _DEFAULT_TARIF)
    return {
        'code': code,
        'nom': tarif['nom'],
        't1': tarif['t1'],
        't2': tarif['t2'],
        'prime_fixe_kva': tarif['prime_fixe_kva'],
        'prime_fixe_forfait': tarif['prime_fixe_forfait'],
        't1_limit_base': tarif['t1_limit_base'],
    }


def _get_t1_limit(params, n_days=61):
    """Plafond T1 (kWh) selon le code et le nombre de jours réels."""
    code      = _detect_code(params.get('type_abonnement'))
    tarif     = _CIE_TARIFS.get(code, _DEFAULT_TARIF)
    puissance = float(params.get('puissance_souscrite') or 0)
    base      = tarif['t1_limit_base']
    if code == 'code01':
        return base * (n_days / 30.5)
    return base * max(1.0, puissance) * (n_days / 61.0)


def _calc_facture_detail(consumption, params, n_days=61):
    """
    Facture CIE :
      Sous-total HT = Énergie (T1+T2) + Prime fixe
      TVA           = Sous-total HT × 18 %
      Total TTC     = Sous-total HT × 1,18
    """
    kwh   = max(0.0, float(consumption))
    code  = _detect_code(params.get('type_abonnement'))
    tarif = _CIE_TARIFS.get(code, _DEFAULT_TARIF)

    prix_t1 = tarif['t1']
    prix_t2 = tarif['t2']
    puissance = float(params.get('puissance_souscrite') or 0)

    t1_limit = _get_t1_limit(params, n_days)
    kwh_t1   = min(kwh, t1_limit)
    kwh_t2   = max(0.0, kwh - t1_limit)

    e_t1_ht   = kwh_t1 * prix_t1
    e_t2_ht   = kwh_t2 * prix_t2
    energy_ht = e_t1_ht + e_t2_ht

    if tarif['prime_fixe_forfait'] > 0:
        prime_ht = tarif['prime_fixe_forfait']
    elif tarif['prime_fixe_kva'] > 0:
        prime_ht = puissance * tarif['prime_fixe_kva']
    else:
        prime_ht = 0.0
    sous_total_ht = energy_ht + prime_ht
    tva           = sous_total_ht * _CIE_TVA
    total_ttc     = sous_total_ht + tva

    return {
        'kwh':                round(kwh, 2),
        'kwh_t1':             round(kwh_t1, 2),
        'kwh_t2':             round(kwh_t2, 2),
        'tarif_t1':           prix_t1,
        'tarif_t2':           prix_t2,
        'prime_kva':          tarif['prime_fixe_kva'],
        'prime_forfait':      tarif['prime_fixe_forfait'],
        't1_limit':           round(t1_limit, 1),
        'code_tarif':         code,
        'energy_t1_ht':       int(round(e_t1_ht, 0)),
        'energy_t2_ht':       int(round(e_t2_ht, 0)),
        'energy_ht':          int(round(energy_ht, 0)),
        'prime_ht':           int(round(prime_ht, 0)),
        'sous_total_ht':      int(round(sous_total_ht, 0)),
        'tva_taux_pct':       round(_CIE_TVA * 100, 2),
        'tva':                int(round(tva, 0)),
        'total':              int(round(total_ttc, 0)),
        # Clés legacy JS
        'montant_ht':         int(round(sous_total_ht, 0)),
        'energie_facture_ht': int(round(sous_total_ht, 0)),
        'energie_ttc':        int(round(total_ttc, 0)),
    }


def _get_params():
    try:
        doc = frappe.get_single('Parametre Myconso')
        return {
            'numero_compteur':     doc.numero_compteur or '',
            'type_abonnement':    doc.type_abonnement or '',
            'puissance_souscrite': doc.puissance_souscrite or 0,
            'coefficient_lecture': doc.coefficient_lecture if doc.coefficient_lecture else 1,
        }
    except Exception:
        return {
            'numero_compteur':     '',
            'type_abonnement':    '',
            'puissance_souscrite': 0,
            'coefficient_lecture': 1,
        }


def _calc_facture(consumption, params, n_days=61):
    return float(_calc_facture_detail(consumption, params, n_days)['total'])


@frappe.whitelist()
def get_parametres():
    return _get_params()


@frappe.whitelist()
def save_parametres(data):
    if isinstance(data, str):
        data = json.loads(data)
    doc = frappe.get_single('Parametre Myconso')
    allowed = {'numero_compteur', 'type_abonnement', 'puissance_souscrite', 'coefficient_lecture'}
    for key, val in data.items():
        if key in allowed:
            setattr(doc, key, val)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return True


# ── Index CRUD ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_indexes(date_from=None, date_to=None, page=1, per_page=10):
    page, per_page = int(page), int(per_page)
    filters = {}
    if date_from and date_to:
        filters['date_index'] = ['between', [date_from, date_to]]
    elif date_from:
        filters['date_index'] = ['>=', date_from]
    elif date_to:
        filters['date_index'] = ['<=', date_to]

    total = frappe.db.count('Index Conso', filters=filters)
    rows = frappe.get_all(
        'Index Conso',
        fields=['name', 'valeur_index', 'date_index', 'heure_index'],
        filters=filters,
        order_by='date_index desc, heure_index desc',
        start=(page - 1) * per_page,
        page_length=per_page,
    )
    return {'rows': rows, 'total': total, 'page': page, 'per_page': per_page}


@frappe.whitelist()
def add_index(valeur_index, date_index, heure_index):
    doc = frappe.get_doc({
        'doctype': 'Index Conso',
        'valeur_index': float(valeur_index),
        'date_index': date_index,
        'heure_index': heure_index,
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return doc.name


@frappe.whitelist()
def update_index(name, valeur_index, date_index, heure_index):
    doc = frappe.get_doc('Index Conso', name)
    doc.valeur_index = float(valeur_index)
    doc.date_index = date_index
    doc.heure_index = heure_index
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return True


@frappe.whitelist()
def delete_index(name):
    frappe.delete_doc('Index Conso', name, ignore_permissions=True)
    frappe.db.commit()
    return True


@frappe.whitelist()
def get_tracker_data(month, year):
    month, year = int(month), int(year)
    days_in_month = cal_mod.monthrange(year, month)[1]
    date_from = f"{year:04d}-{month:02d}-01"
    date_to = f"{year:04d}-{month:02d}-{days_in_month:02d}"

    rows = frappe.get_all(
        'Index Conso',
        fields=['date_index'],
        filters={'date_index': ['between', [date_from, date_to]]},
        pluck='date_index',
    )
    days_with_entry = sorted(set(int(str(d).split('-')[2]) for d in rows))
    return {
        'days_with_entry': days_with_entry,
        'days_in_month': days_in_month,
        'month': month,
        'year': year,
    }


# ── Utilisateurs ────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_users():
    return frappe.db.sql("""
        SELECT
            u.name AS user,
            COALESCE(u.full_name, u.name) AS full_name,
            u.email,
            GROUP_CONCAT(hr.role ORDER BY hr.role SEPARATOR ', ') AS roles
        FROM `tabUser` u
        INNER JOIN `tabHas Role` hr ON hr.parent = u.name
        WHERE hr.role IN ('Collecteur', 'Chef', 'Staticien')
          AND u.enabled = 1
          AND u.user_type = 'System User'
        GROUP BY u.name, u.full_name, u.email
        ORDER BY u.full_name
    """, as_dict=True)


@frappe.whitelist()
def add_user_roles(user, roles):
    if isinstance(roles, str):
        roles = json.loads(roles)
    myconso_roles = {'Collecteur', 'Chef', 'Staticien'}
    doc = frappe.get_doc('User', user)
    doc.roles = [r for r in doc.roles if r.role not in myconso_roles]
    for role in roles:
        if role in myconso_roles:
            doc.append('roles', {'role': role})
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return True


@frappe.whitelist()
def remove_user(user):
    myconso_roles = {'Collecteur', 'Chef', 'Staticien'}
    doc = frappe.get_doc('User', user)
    doc.roles = [r for r in doc.roles if r.role not in myconso_roles]
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return True


@frappe.whitelist()
def setup_roles():
    created = []
    for role_name in ['Collecteur', 'Chef', 'Staticien']:
        if not frappe.db.exists('Role', role_name):
            frappe.get_doc({
                'doctype': 'Role',
                'role_name': role_name,
                'desk_access': 1,
            }).insert(ignore_permissions=True)
            created.append(role_name)
    if created:
        frappe.db.commit()
    return created


# ── Factures ────────────────────────────────────────────────────────────────

MONTH_NAMES_SHORT = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                     'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
MONTH_NAMES_LONG = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']


def _bimonthly_period_key(year_str, month_int):
    """Return canonical period key = YYYY-MM of the first month in the 2-month pair."""
    first_mo = month_int if month_int % 2 == 1 else month_int - 1
    return f"{year_str}-{first_mo:02d}"


def _bimonthly_label(period_key):
    yr, mo1_str = period_key.split('-')
    mo1 = int(mo1_str)
    mo2 = mo1 + 1
    if mo2 <= 12:
        return f"{MONTH_NAMES_SHORT[mo1]}-{MONTH_NAMES_SHORT[mo2]} {yr}"
    return f"{MONTH_NAMES_SHORT[mo1]} {yr}"


@frappe.whitelist()
def get_factures(year=None, date_from=None, date_to=None):
    params = _get_params()
    coeff  = float(params.get('coefficient_lecture') or 1)
    anchor_before = None
    filters = {}
    if year:
        anchor_before = f'{year}-01-01'
        filters['date_index'] = ['between', [anchor_before, f'{year}-12-31']]
    elif date_from and date_to:
        anchor_before = date_from
        filters['date_index'] = ['between', [date_from, date_to]]

    indexes = frappe.get_all(
        'Index Conso',
        fields=['valeur_index', 'date_index'],
        filters=filters,
        order_by='date_index asc, heure_index asc',
    )
    if not indexes:
        return []

    # Groupe par période bimestrielle : retient l'index max de chaque période
    period_max = {}
    for idx in indexes:
        mk = str(idx.date_index)[:7]
        yr_str, mo_str = mk.split('-')
        pk = _bimonthly_period_key(yr_str, int(mo_str))
        v = float(idx.valeur_index)
        d = str(idx.date_index)
        if pk not in period_max or v > period_max[pk][0]:
            period_max[pk] = (v, d)

    sorted_periods = sorted(period_max.keys())

    # Chercher l'index juste avant la fenêtre pour calculer la 1ère période
    prev_entry = None
    if anchor_before:
        anchor_row = frappe.db.get_value(
            'Index Conso',
            {'date_index': ['<', anchor_before]},
            ['valeur_index', 'date_index'],
            order_by='date_index desc, heure_index desc',
            as_dict=True,
        )
        if anchor_row:
            prev_entry = (float(anchor_row.valeur_index), str(anchor_row.date_index))

    factures = []
    for pk in sorted_periods:
        cur_entry = period_max[pk]
        if prev_entry is not None:
            consumption = abs(cur_entry[0] - prev_entry[0]) * coeff
            try:
                d_from_dt = _dt.fromisoformat(prev_entry[1])
                d_to_dt   = _dt.fromisoformat(cur_entry[1])
                n_days    = max(1, (d_to_dt - d_from_dt).days)
            except Exception:
                n_days = 61
            detail = _calc_facture_detail(consumption, params, n_days)
            factures.append({
                'period':           _bimonthly_label(pk),
                'period_key':       pk,
                'consumption':      round(consumption, 2),
                'amount':           detail['total'],
                'index_ancien':     int(prev_entry[0]),
                'index_nouveau':    int(cur_entry[0]),
                'date_from':        prev_entry[1],
                'date_to':          cur_entry[1],
                'numero_compteur':  params.get('numero_compteur', ''),
                'breakdown':        detail,
            })
        prev_entry = cur_entry

    return list(reversed(factures))


@frappe.whitelist()
def predict_facture(index_debut, index_fin):
    params = _get_params()
    coeff  = float(params.get('coefficient_lecture') or 1)
    consumption = (float(index_fin) - float(index_debut)) * coeff
    if consumption < 0:
        frappe.throw(_("L'index fin doit être supérieur à l'index début"))
    d = _calc_facture_detail(consumption, params, n_days=61)
    d['consumption'] = d['kwh']
    d['co2'] = round(consumption * _CIE_CO2_FACTOR, 2)
    return d


# ── Chart / Dashboard ───────────────────────────────────────────────────────

def _last_idx_before(date_str):
    v = frappe.db.get_value(
        'Index Conso',
        {'date_index': ['<=', date_str]},
        'valeur_index',
        order_by='date_index desc, heure_index desc',
    )
    return float(v) if v else None


@frappe.whitelist()
def get_chart_data(period='week'):
    today_str = frappe.utils.today()
    today_dt  = frappe.utils.getdate(today_str)

    if period == 'week':
        labels, values = [], []
        for i in range(6, -1, -1):
            d = frappe.utils.add_days(today_str, -i)
            d_obj = frappe.utils.getdate(d)
            labels.append(f"{d_obj.day} {MONTH_NAMES_SHORT[d_obj.month]}")
            prev_d = frappe.utils.add_days(d, -1)
            end_v = _last_idx_before(d)
            start_v = _last_idx_before(prev_d)
            values.append(round(max(0, end_v - start_v), 2) if end_v and start_v else 0)
        return {'labels': labels, 'consumption': values}

    elif period == 'current_month':
        labels, values = [], []
        days = cal_mod.monthrange(today_dt.year, today_dt.month)[1]
        for day in range(1, days + 1):
            d_s = f"{today_dt.year:04d}-{today_dt.month:02d}-{day:02d}"
            if d_s > today_str:
                break
            prev_s = frappe.utils.add_days(d_s, -1)
            end_v   = _last_idx_before(d_s)
            start_v = _last_idx_before(str(prev_s))
            labels.append(str(day))
            values.append(round(max(0, end_v - start_v), 2) if end_v and start_v else 0)
        return {'labels': labels, 'consumption': values}

    elif period == 'year':
        # Bimestriel pour l'année courante
        labels, values = [], []
        y = today_dt.year
        for bm in range(1, 12, 2):
            bm2  = bm + 1
            last = cal_mod.monthrange(y, bm2)[1]
            p_end = f"{y:04d}-{bm2:02d}-{last:02d}"
            if p_end > today_str:
                p_end = today_str
            prev_bm = bm - 1
            if prev_bm == 0:
                p_prev = f"{y-1:04d}-12-31"
            else:
                pl     = cal_mod.monthrange(y, prev_bm)[1]
                p_prev = f"{y:04d}-{prev_bm:02d}-{pl:02d}"
            end_v   = _last_idx_before(p_end)
            start_v = _last_idx_before(p_prev)
            labels.append(f"{MONTH_NAMES_SHORT[bm]}-{MONTH_NAMES_SHORT[bm2]}")
            values.append(round(max(0, end_v - start_v), 2) if end_v and start_v else 0)
            if p_end == today_str:
                break
        return {'labels': labels, 'consumption': values}

    return {'labels': [], 'consumption': []}


@frappe.whitelist()
def get_dashboard_summary():
    params = _get_params()
    coeff  = float(params.get('coefficient_lecture') or 1)
    today_str = frappe.utils.today()
    today_dt = frappe.utils.getdate(today_str)
    m, y = today_dt.month, today_dt.year

    latest = frappe.db.get_value(
        'Index Conso', {},
        ['valeur_index', 'date_index', 'heure_index'],
        order_by='date_index desc, heure_index desc',
        as_dict=True,
    )

    # Période bimestrielle courante
    first_mo = m if m % 2 == 1 else m - 1
    if first_mo == 1:
        prev_end_year, prev_end_month = y - 1, 12
    else:
        prev_end_year, prev_end_month = y, first_mo - 1
    prev_end_day = cal_mod.monthrange(prev_end_year, prev_end_month)[1]
    prev_period_end_str = f"{prev_end_year:04d}-{prev_end_month:02d}-{prev_end_day:02d}"

    cur_v = _last_idx_before(today_str) or 0
    prev_v = _last_idx_before(prev_period_end_str) or 0
    consumption = max(0, cur_v - prev_v) * coeff
    current_bill = _calc_facture(consumption, params, n_days=61)
    co2 = round(consumption * _CIE_CO2_FACTOR, 2)

    # Comparaison avec les 3 derniers bimestres (6 mois) pour la tendance
    six_months_ago = frappe.utils.add_months(today_str, -6)
    v6 = _last_idx_before(str(six_months_ago)) or 0
    avg_bimonthly_6 = (cur_v - v6) / 3 if cur_v > v6 else 0
    pct_change = round(((consumption - avg_bimonthly_6) / avg_bimonthly_6 * 100), 1) if avg_bimonthly_6 else 0

    mo2 = first_mo + 1
    period_label = (f"{MONTH_NAMES_LONG[first_mo]}-{MONTH_NAMES_LONG[mo2]}"
                    if mo2 <= 12 else MONTH_NAMES_LONG[first_mo])

    return {
        'params': params,
        'latest_index': latest,
        'consumption_this_month': round(consumption, 2),
        'current_bill': int(current_bill),
        'co2': co2,
        'current_month_label': period_label,
        'pct_change': pct_change,
    }


# ── Statistics / Empreinte ───────────────────────────────────────────────────

def _kwh_to_fcfa_stats(kwh, params):
    """Coût énergie TTC (sans prime fixe) — pour graphiques."""
    if kwh <= 0:
        return 0
    kwh   = float(kwh)
    code  = _detect_code(params.get('type_abonnement'))
    tarif = _CIE_TARIFS.get(code, _DEFAULT_TARIF)
    t1_limit  = _get_t1_limit(params, n_days=30)
    kwh_t1    = min(kwh, t1_limit)
    kwh_t2    = max(0.0, kwh - t1_limit)
    energy_ht = kwh_t1 * tarif['t1'] + kwh_t2 * tarif['t2']
    return round(energy_ht * (1 + _CIE_TVA), 0)


def _get_period_data(period, date_from, date_to, today_str, today_dt):
    """Return (labels, kwh_values) for the requested period."""
    from datetime import timedelta as _td
    labels, values = [], []

    if date_from and date_to:
        d_from = frappe.utils.getdate(date_from)
        d_to   = frappe.utils.getdate(date_to)
        cur = d_from
        while cur <= d_to:
            d_s     = str(cur)
            prev_s  = str(cur - _td(days=1))
            end_v   = _last_idx_before(d_s)
            start_v = _last_idx_before(prev_s)
            labels.append(f"{cur.day} {MONTH_NAMES_SHORT[cur.month]}")
            values.append(round(max(0, end_v - start_v), 2) if end_v and start_v else 0)
            cur += _td(days=1)

    elif period == 'semaine':
        for i in range(6, -1, -1):
            d       = frappe.utils.add_days(today_str, -i)
            d_obj   = frappe.utils.getdate(d)
            prev    = frappe.utils.add_days(d, -1)
            end_v   = _last_idx_before(d)
            start_v = _last_idx_before(str(prev))
            labels.append(f"{d_obj.day} {MONTH_NAMES_SHORT[d_obj.month]}")
            values.append(round(max(0, end_v - start_v), 2) if end_v and start_v else 0)

    elif period == 'mois':
        days = cal_mod.monthrange(today_dt.year, today_dt.month)[1]
        for day in range(1, days + 1):
            d_s     = f"{today_dt.year:04d}-{today_dt.month:02d}-{day:02d}"
            if d_s > today_str:
                break
            prev_s  = str(frappe.utils.add_days(d_s, -1))
            end_v   = _last_idx_before(d_s)
            start_v = _last_idx_before(prev_s)
            labels.append(str(day))
            values.append(round(max(0, end_v - start_v), 2) if end_v and start_v else 0)

    elif period == 'annee':
        for bm in range(1, 12, 2):
            bm2   = bm + 1
            last  = cal_mod.monthrange(today_dt.year, bm2)[1]
            p_end = f"{today_dt.year:04d}-{bm2:02d}-{last:02d}"
            if p_end > today_str:
                p_end = today_str
            prev_bm = bm - 1
            if prev_bm == 0:
                p_prev = f"{today_dt.year-1:04d}-12-31"
            else:
                pl     = cal_mod.monthrange(today_dt.year, prev_bm)[1]
                p_prev = f"{today_dt.year:04d}-{prev_bm:02d}-{pl:02d}"
            end_v   = _last_idx_before(p_end)
            start_v = _last_idx_before(p_prev)
            labels.append(f"{MONTH_NAMES_SHORT[bm]}-{MONTH_NAMES_SHORT[bm2]}")
            values.append(round(max(0, end_v - start_v), 2) if end_v and start_v else 0)
            if p_end == today_str:
                break

    return labels, values


@frappe.whitelist()
def get_statistics_data(chart_type='kwh', period='semaine', date_from=None, date_to=None):
    params    = _get_params()
    today_str = frappe.utils.today()
    today_dt  = frappe.utils.getdate(today_str)

    if chart_type == 'factures':
        rows = list(reversed(get_factures(year=str(today_dt.year))))
        return {
            'labels': [r['period'] for r in rows],
            'values': [r['amount'] for r in rows],
            'unit':   'FCFA',
        }

    labels, kwh_values = _get_period_data(period, date_from, date_to, today_str, today_dt)

    if chart_type == 'kwh':
        return {'labels': labels, 'values': kwh_values, 'unit': 'kWh'}

    if chart_type == 'fcfa':
        fcfa = [int(_kwh_to_fcfa_stats(v, params)) for v in kwh_values]
        return {'labels': labels, 'values': fcfa, 'unit': 'FCFA'}

    return {'labels': [], 'values': [], 'unit': ''}


@frappe.whitelist()
def get_statistics_report(period='semaine', date_from=None, date_to=None):
    params    = _get_params()
    today_str = frappe.utils.today()
    today_dt  = frappe.utils.getdate(today_str)

    labels, kwh_values = _get_period_data(period, date_from, date_to, today_str, today_dt)
    non_zero = [(l, v) for l, v in zip(labels, kwh_values) if v > 0]

    if not non_zero:
        return {'comments': ['Aucune donnée disponible pour cette période.'],
                'co2': 0, 'total_kwh': 0, 'avg_kwh': 0,
                'labels': labels, 'values': kwh_values}

    total      = sum(v for _, v in non_zero)
    avg        = total / len(non_zero)
    max_lbl, max_val = max(non_zero, key=lambda x: x[1])
    co2        = round(total * _CIE_CO2_FACTOR, 2)

    mid   = max(1, len(non_zero) // 2)
    f_avg = sum(v for _, v in non_zero[:mid]) / mid
    s_avg = sum(v for _, v in non_zero[mid:]) / max(1, len(non_zero) - mid)
    trend = 'hausse' if s_avg > f_avg * 1.1 else ('baisse' if s_avg < f_avg * 0.9 else 'stable')

    p_lbl = {'semaine': 'la semaine', 'mois': 'ce mois', 'annee': "l'année"}.get(period, 'la période')
    trend_txt = {
        'hausse': f"La consommation sur {p_lbl} présente <strong>une tendance à la hausse</strong>, avec une moyenne de <strong>{round(avg, 1)} kWh</strong> par période.",
        'baisse': f"La consommation sur {p_lbl} est en <strong>baisse</strong> — moyenne de <strong>{round(avg, 1)} kWh</strong>. Continuez vos efforts !",
        'stable': f"La consommation sur {p_lbl} est <strong>globalement stable</strong>, avec une moyenne de <strong>{round(avg, 1)} kWh</strong> par période.",
    }[trend]

    comments = [
        trend_txt,
        f"Le pic a été enregistré le <strong>{max_lbl}</strong> avec <strong>{max_val} kWh</strong>. Cela peut indiquer l'utilisation d'appareils énergivores.",
        f"Cette consommation représente <strong>{co2} kg de CO₂</strong>, soit l'équivalent de <strong>{round(co2*4.7, 1)} km</strong> parcourus en voiture.",
    ]

    # Pie 1 : répartition kWh (top 4 + Autres)
    pairs = sorted([(l, v) for l, v in zip(labels, kwh_values) if v > 0],
                   key=lambda x: x[1], reverse=True)
    if len(pairs) > 4:
        top = pairs[:4]
        rest = round(sum(v for _, v in pairs[4:]), 2)
        pie1_labels = [l for l, _ in top] + ['Autres']
        pie1_values = [round(v, 2) for _, v in top] + [rest]
    else:
        pie1_labels = [l for l, _ in pairs]
        pie1_values = [round(v, 2) for _, v in pairs]

    # Pie 2 : structure de la facture CIE (bimestriel)
    d2        = _calc_facture_detail(total, params, n_days=61)
    energy_t1 = d2['energy_t1_ht']
    energy_t2 = d2['energy_t2_ht']
    prime_ht  = d2['prime_ht']
    tva_amt   = d2['tva']
    tva_lbl   = f"TVA {d2['tva_taux_pct']:.0f}%"

    if energy_t2 > 0:
        pie2_labels = ['Énergie T1', 'Énergie T2', 'Prime fixe', tva_lbl]
        pie2_values = [energy_t1, energy_t2, prime_ht, tva_amt]
    else:
        pie2_labels = ['Énergie T1', 'Prime fixe', tva_lbl]
        pie2_values = [energy_t1 + energy_t2, prime_ht, tva_amt]

    return {
        'comments': comments,
        'co2': co2,
        'total_kwh': round(total, 2),
        'avg_kwh':   round(avg, 2),
        'max_kwh':   max_val,
        'trend':     trend,
        'labels':    labels,
        'values':    kwh_values,
        'pie1': {'labels': pie1_labels, 'values': pie1_values},
        'pie2': {'labels': pie2_labels, 'values': pie2_values},
    }


@frappe.whitelist()
def get_empreinte_carbone_data(period='semaine', date_from=None, date_to=None):
    today_str = frappe.utils.today()
    today_dt  = frappe.utils.getdate(today_str)
    facteur   = _CIE_CO2_FACTOR

    labels, kwh_values = _get_period_data(period, date_from, date_to, today_str, today_dt)
    co2_values = [round(v * facteur, 2) for v in kwh_values]
    non_zero   = [v for v in co2_values if v > 0]

    total   = round(sum(non_zero), 2)
    avg     = round(total / len(non_zero), 2) if non_zero else 0
    max_co2 = max(non_zero) if non_zero else 0
    min_co2 = min(non_zero) if non_zero else 0
    max_idx = co2_values.index(max_co2) if max_co2 > 0 else 0
    max_lbl = labels[max_idx] if max_idx < len(labels) else ''

    CO2_MAX   = 25.0
    gauge_pct = min(total / CO2_MAX, 1.0)

    if gauge_pct < 0.3:
        motivation = 'Excellent !\nVotre empreinte carbone est très faible !'
    elif gauge_pct < 0.6:
        motivation = 'Bon ratio, continuez !\nLa Planète vous remercie !'
    else:
        motivation = "Empreinte élevée.\nRéduisez votre consommation !"

    p_lbl = {'semaine': 'la semaine', 'mois': 'ce mois', 'annee': "l'année"}.get(period, 'la période')

    if not non_zero:
        comments = ['Aucune donnée disponible pour cette période.']
    else:
        c2 = (f"Le pic d'émission a été enregistré le <strong>{max_lbl}</strong> avec <strong>{max_co2} kg CO₂</strong>. Pensez à identifier les appareils énergivores."
              if max_lbl else f"Le pic d'émission est de <strong>{max_co2} kg CO₂</strong>.")
        comments = [
            f"Sur {p_lbl}, votre empreinte carbone est de <strong>{total} kg CO₂</strong>, soit en moyenne <strong>{avg} kg CO₂</strong> par période.",
            c2,
            f"<strong>{total} kg CO₂</strong> = <strong>{round(total*4.7, 1)} km</strong> en voiture ou la compensation de <strong>{max(1, round(total/21.0, 1))} arbre(s)</strong> par an.",
        ]

    tips = []
    if non_zero and max_co2 > avg * 1.5:
        tips.append({
            'title': 'Pic inhabituel détecté',
            'text':  f'Un pic de <strong>{max_co2} kg CO₂</strong> le <strong>{max_lbl}</strong>. Vérifiez si un appareil énergivore (climatiseur, chauffe-eau, four) a été utilisé.',
        })
    tips.append({
        'title': 'Économies possibles',
        'text':  'Débrancher les appareils en veille réduit la consommation de <strong>5 à 10 %</strong>. Utilisez des multiprises avec interrupteur.',
    })
    tips.append({
        'title': 'Saviez-vous ?',
        'text':  f'1 kg CO₂ ≈ <strong>4,7 km en voiture</strong>. Votre moyenne de <strong>{avg} kg CO₂</strong>/période = {round(avg*4.7, 1)} km en voiture.',
    })
    tips.append({
        'title': 'Heure de pointe',
        'text':  'Évitez d\'utiliser vos gros appareils (lave-linge, chauffe-eau) entre <strong>18h et 22h</strong>, heure de forte demande sur le réseau.',
    })

    return {
        'labels':      labels,
        'co2_values':  co2_values,
        'total_co2':   total,
        'avg_co2':     avg,
        'max_co2':     max_co2,
        'min_co2':     min_co2,
        'max_lbl':     max_lbl,
        'gauge_pct':   gauge_pct,
        'gauge_value': total,
        'motivation':  motivation,
        'comments':    comments,
        'tips':        tips,
    }


@frappe.whitelist()
def get_weather_data(lat, lon):
    import requests
    try:
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,weathercode,apparent_temperature,windspeed_10m,relativehumidity_2m"
            f"&timezone=auto"
        )
        weather = requests.get(weather_url, timeout=6).json()

        geo_url = (
            f"https://nominatim.openstreetmap.org/reverse"
            f"?lat={lat}&lon={lon}&format=json&accept-language=fr"
        )
        geo = requests.get(
            geo_url,
            headers={'User-Agent': 'Myconso2-Frappe/1.0'},
            timeout=6,
        ).json()

        addr = geo.get('address', {})
        city = (addr.get('city') or addr.get('town') or
                addr.get('municipality') or addr.get('village') or '')
        country = addr.get('country_code', '').upper()
        cur = weather.get('current', {})
        return {
            'temperature': cur.get('temperature_2m'),
            'weathercode': cur.get('weathercode'),
            'windspeed': cur.get('windspeed_10m'),
            'humidity': cur.get('relativehumidity_2m'),
            'city': city,
            'country': country,
        }
    except Exception as e:
        return {'error': str(e)}
