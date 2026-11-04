import frappe


# Coordonnées par défaut : Abidjan
_DEFAULT_LAT = 5.3599
_DEFAULT_LON = -4.0082


def record_hourly_weather():
    """Enregistre la météo d'Abidjan chaque heure dans la table Meteorologie."""
    try:
        from myconso2.myconso2.api import get_current_weather
        get_current_weather(lat=_DEFAULT_LAT, lon=_DEFAULT_LON)
    except Exception as e:
        frappe.log_error(f"Erreur enregistrement météo horaire : {e}", "Météo Scheduler")
