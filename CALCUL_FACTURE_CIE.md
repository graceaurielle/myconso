# Méthode de calcul d'une facture CIE — Implémentation MyConso

> Mise à jour : mai 2026

---

## 1. Données d'entrée

| Donnée | Source | Description |
|--------|--------|-------------|
| `index_ancien` | Base de données | Valeur max de l'index sur la période précédente |
| `index_nouveau` | Base de données | Valeur max de l'index sur la période courante |
| `coefficient_lecture` | Paramètres | Multiplicateur de l'index (défaut : 1) |
| `n_jours` | Calculé | Nombre de jours réels entre les deux relevés |
| `puissance_souscrite` | Paramètres | Puissance en kVA |
| `type_abonnement` | Paramètres | Code Tarif CIE (Code 01 à 17) |

```
consommation (kWh) = abs(index_nouveau − index_ancien) × coefficient_lecture
```

---

## 2. Champs du doctype `Parametre Myconso`

L'utilisateur ne configure que trois champs. Tous les tarifs (prix T1, T2, prime…)
sont déduits automatiquement du code choisi.

| Champ | Type | Description |
|-------|------|-------------|
| `type_abonnement` | Select | Code Tarif CIE (ex. « Code 02 — Domestique Général ») |
| `puissance_souscrite` | Float | Puissance souscrite en kVA |
| `coefficient_lecture` | Float | Multiplicateur de l'index brut (défaut 1) |

---

## 3. Barème tarifaire `_CIE_TARIFS` (hardcodé dans `api.py`)

Les prix sont en **FCFA HT** et proviennent du tarif officiel CIE.

| Code | Nom | T1 (FCFA/kWh) | T2 (FCFA/kWh) | Prime fixe kVA (FCFA/kVA/bim.) | Prime forfait (FCFA/bim.) | Base T1 (kWh) |
|------|-----|---------------|---------------|-------------------------------|--------------------------|---------------|
| code01 | Domestique Modéré | 57,43 | 47,96 | — | **614,90** (forfait) | 80 / mois |
| code02 | Domestique Général | 57,43 | 47,96 | 1 246,56 | — | 180 / kVA |
| code03 | Général Professionnel | 86,31 | 86,31 | 1 552,10 | — | 180 / kVA |
| code04 | Eclairage Public | 73,41 | 73,41 | — | — | 180 / kVA |
| code05 | Conventionnel | 80,00 | 80,00 | 1 400,00 | — | 180 / kVA |
| code17 | Domestique Général 5A | 57,43 | 47,96 | 1 246,56 | — | 180 / kVA |

**Constantes fixes (réglementaires)**

| Constante | Valeur |
|-----------|--------|
| TVA | 18 % |
| Facteur CO₂ | 0,27 kg/kWh |

---

## 4. Plafond de la Tranche 1

### Code 01 — Domestique Modéré (base fixe, indépendante du kVA)

```
T1_limite = 80 × (n_jours / 30,5)   [kWh]
```

### Codes 02, 03, 04, 05, 17 (base proportionnelle au kVA)

```
T1_limite = 180 × max(1, puissance_kVA) × (n_jours / 61)   [kWh]
```

---

## 5. Formule complète

```
kWh_T1        = min(consommation, T1_limite)
kWh_T2        = max(0, consommation − T1_limite)

Énergie HT    = kWh_T1 × prix_T1 + kWh_T2 × prix_T2

Prime HT      = prime_fixe_forfait            (si Code 01)
              = puissance × prime_fixe_kva    (si Code 02, 03, 05, 17)
              = 0                              (si Code 04)

Sous-total HT = Énergie HT + Prime HT
TVA (18 %)    = Sous-total HT × 0,18
Total TTC     = Sous-total HT × 1,18
```

---

## 6. Exemples de calcul

### Code 02 — Domestique Général

**Données :** consommation = 2 509 kWh, puissance = 4,4 kVA, 61 jours

```
T1_limite  = 180 × 4,4 × (61/61)  = 792 kWh
kWh_T1     = 792    → 792 × 57,43 =  45 484 FCFA
kWh_T2     = 1 717  → 1717 × 47,96 = 82 347 FCFA
Énergie HT = 127 831 FCFA
Prime HT   = 4,4 × 1 246,56       =   5 485 FCFA
Sous-total = 133 316 FCFA
TVA (18 %) =  23 997 FCFA
Total TTC  = 157 313 FCFA
```

### Code 01 — Domestique Modéré

**Données :** consommation = 150 kWh, puissance = 5 kVA, 61 jours

```
T1_limite  = 80 × (61/30,5)  = 160 kWh
kWh_T1     = 150  (tout en T1) → 150 × 57,43 = 8 615 FCFA
kWh_T2     = 0
Énergie HT = 8 615 FCFA
Prime HT   = 614,90 FCFA (forfait fixe)
Sous-total = 9 230 FCFA
TVA (18 %) = 1 661 FCFA
Total TTC  = 10 891 FCFA
```

---

## 7. Formule pour les graphiques de statistiques

Pour les graphiques (journalier, hebdomadaire), la prime fixe est exclue
afin de ne pas fausser la lecture sur de petites périodes.

```
t1_limit  = base × [kVA] × (30 / 61)   # base mensuelle ~30 jours
energy_ht = kWh_T1 × prix_T1 + kWh_T2 × prix_T2
coût_stats = energy_ht × 1,18
```

---

## 8. Fonctions implémentées dans `api.py`

| Fonction | Rôle |
|----------|------|
| `_detect_code(type_abo)` | Retourne `'code01'`…`'code17'` depuis le libellé |
| `_get_t1_limit(params, n_days)` | Plafond T1 selon code et jours réels |
| `_calc_facture_detail(consumption, params, n_days)` | Calcul complet → dict tous les postes |
| `_kwh_to_fcfa_stats(kwh, params)` | Coût énergie TTC sans prime (pour graphiques) |
| `_get_params()` | Lit les 3 paramètres depuis le Single Doctype |
| `get_tarif_by_code(type_abonnement)` | API publique → retourne le barème du code choisi |
| `get_factures(year, ...)` | Toutes les factures bimestrielles de l'année |
| `predict_facture(index_debut, index_fin)` | Simulation sur deux index |
| `save_parametres(data)` | Sauvegarde les 3 paramètres configurables |

---

*Document MyConso v2 — mai 2026*
