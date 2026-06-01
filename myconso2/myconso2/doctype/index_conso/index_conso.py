import frappe
from frappe.model.document import Document


class IndexConso(Document):
	def autoname(self):
		date_str = str(self.date_index or frappe.utils.today()).replace('-', '')
		self.name = f"IDX-{date_str}-{frappe.generate_hash(length=4).upper()}"
