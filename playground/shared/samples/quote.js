export default {
	version: "1.7",
	subset: "PDF/A-3b",
	tagged: true,
	displayTitle: true,
	pageSize: "A4",
	pageMargins: [24, 24, 24, 24],
	info: {
		title: "Devis D-2026-0842",
		author: "Lumen Atelier SAS",
		subject: "Devis Nordique Design",
	},
	files: {
		"factur-x.xml": {
			src: "./test.xml",
			name: "factur-x.xml",
			relationship: "Alternative",
			type: "text/xml",
			description: "Factur-X invoice",
		},
	},
	content: [
		{
			columns: [
				{
					width: "*",
					stack: [
						{
							image: "playground/logo.jpg",
							borderRadius: 12,
							//borderWidth: 2,
							//borderColor: "#334155",
							width: 70,
							margin: [0, 0, 0, 0],
						},
					],
				},
				{
					width: "auto",
					stack: [
						{ text: "Date d'émission", color: "#52577A", fontSize: 9 },
						{ text: "14/03/2026", font: "FigtreeSemiBold" },
					],
					margin: [0, 0, 0, 0],
					alignment: "left",
				},
				{
					width: "auto",
					stack: [
						{ text: "Date d'expiration", color: "#52577A", fontSize: 9 },
						{ text: "14/04/2026", font: "FigtreeSemiBold" },
					],
					margin: [0, 0, 0, 0],
					alignment: "left",
				},
			],
			columnGap: 30,
		},
		{
			margin: [0, 15, 0, 0],
			stack: [
				{
					text: "Devis N°D-2026-0842",
					bold: true,
					fontSize: 15,
				},
				{
					text: "Bon de commande N°BC-9173",
					color: "#52577A",
					fontSize: 9,
				},
			],
		},
		{
			columns: [
				{
					width: "*",
					stack: [
						{
							text: "Émetteur",
							color: "#52577A",
							bold: true,
							fontSize: 8,
						},
						{
							text: "Lumen Atelier SAS",
							fontSize: 15,
						},
						{
							text: "14 rue des Glycines",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "33000 Bordeaux, France",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "contact@lumen-atelier.example",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "05 56 12 34 56",
							color: "#52577A",
							fontSize: 9,
						},
					],
				},
				{
					width: "*",
					stack: [
						{
							text: "Client",
							color: "#52577A",
							bold: true,
							fontSize: 8,
						},
						{
							text: "Nordique Design SARL",
							fontSize: 15,
						},
						{
							text: "8 allée du Phare",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "59000 Lille, France",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "SIREN : 491 203 847",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "N° de TVA : FR28 491 203 847",
							color: "#52577A",
							fontSize: 9,
						},
					],
					alignment: "left",
				},
			],
			margin: [0, 20, 0, 0],
			columnGap: 30,
		},
		{
			width: "auto",
			stack: [
				{
					text: "Projet campus connecté",
					fontSize: 14,
				},
				{
					text: "Prestation pluridisciplinaire pour le déploiement et la supervision du site de Lille",
					fontSize: 8,
				},
			],
			alignment: "left",
			margin: [0, 20, 0, 0],
		},
		{
			margin: [0, 10, 0, 0],
			table: {
				borderRadius: 10,
				widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto"],
				header: {
					rows: [
						[
							{
								text: " Produit / Service",
								style: "tableHeader",
								alignment: "left",
							},
							{
								text: "Qté",
								style: "tableHeader",
								alignment: "right",
							},
							{
								text: "Unit.",
								style: "tableHeader",
								alignment: "right",
							},
							{
								text: "P.U. HT",
								style: "tableHeader",
								alignment: "right",
							},
							{
								text: "TVA",
								style: "tableHeader",
								alignment: "right",
							},
							{
								text: "Total HT",
								style: "tableHeader",
								alignment: "right",
							},
							{
								text: "Total TTC",
								style: "tableHeader",
								alignment: "right",
							},
						],
					],
					layout: {
						fillColor() {
							return "#E0E3FD";
						},
						vLineWidth() {
							return 0.5;
						},
						vLineColor() {
							return "#E3E3E8";
						},
						hLineWidth() {
							return 0.5;
						},
						hLineColor() {
							return "#E3E3E8";
						},
						paddingTop() {
							return 7;
						},
						paddingBottom() {
							return 5;
						},
						paddingLeft(colIndex) {
							return colIndex === 0 ? 10 : 8;
						},
						paddingRight(colIndex, node) {
							return colIndex === node.table.widths.length - 1 ? 10 : 8;
						},
					},
				},
				body: {
					groups: [
						{
							keepTogether: true,
							dontBreakRows: true,
							rows: [
								[
									{
										stack: [
											{
												text: "Abonnement supervision cloud",
												fontSize: 10,
											},
											{
												text: "Supervision continue des équipements, interventions préventives, rapports mensuels, assistance prioritaire et accompagnement des équipes locales.",
												color: "#52577A",
												fontSize: 9,
												margin: [0, 2, 0, 0],
											},
										],
										colSpan: 7,
									},
									{},
									{},
									{},
									{},
									{},
									{},
								],
								[
									{
										stack: [
											{
												text: "Mises à jour logicielles et correctifs",
												fontSize: 9,
												bold: true,
											},
											{
												text: "Ref: CLOUD-MON-12",
												color: "#52577A",
												fontSize: 9,
											},
										],
									},
									{
										text: "12",
										alignment: "center",
										fontSize: 9,
									},
									{
										text: "Mois",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "490,00 €",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "20%",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "5 880,00 €",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "7 056,00 €",
										alignment: "right",
										fontSize: 9,
									},
								],
								[
									{
										stack: [
											{
												text: "Hotline jours ouvrés",
												fontSize: 9,
												bold: true,
											},
											{
												text: "Ref: CLOUD-MON-12",
												color: "#52577A",
												fontSize: 9,
											},
										],
									},
									{
										text: "12",
										alignment: "center",
										fontSize: 9,
									},
									{
										text: "Mois",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "490,00 €",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "20%",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "5 880,00 €",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "7 056,00 €",
										alignment: "right",
										fontSize: 9,
									},
								],
								[
									{
										stack: [
											{
												text: "Rapport mensuel de disponibilité",
												fontSize: 9,
												bold: true,
											},
											{
												text: "Ref: CLOUD-MON-12",
												color: "#52577A",
												fontSize: 9,
											},
										],
									},
									{
										text: "12",
										alignment: "center",
										fontSize: 9,
									},
									{
										text: "Mois",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "490,00 €",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "20%",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "5 880,00 €",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "7 056,00 €",
										alignment: "right",
										fontSize: 9,
									},
								],
							],
							layout: {
								hLineWidth() {
									return 0;
								},
								vLineWidth() {
									return 0;
								},
								paddingTop(rowIndex) {
									return rowIndex === 0 ? 6 : 2;
								},
								paddingBottom(rowIndex, _node, group) {
									return rowIndex === group.rowCount - 1 ? 6 : 2;
								},
							},
						},
						{
							keepTogether: true,
							dontBreakRows: true,
							rows: [
								[
									{
										stack: [
											{
												text: "Audit Wi-Fi campus",
												fontSize: 10,
											},
											{
												text: "Ref: AUD-WIFI-26",
												color: "#52577A",
												fontSize: 9,
											},
										],
									},
									{
										text: "3",
										alignment: "center",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "Forfaits",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "1 850,00 €",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "20%",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "5 550,00 €",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "6 660,00 €",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
								],
								[
									{
										text: "Cartographie radio, segmentation et revue des équipements critiques sur trois bâtiments.\n\nLivrables :\n- Plan de couverture\n- Rapport sécurité / performance\n- Feuille de route priorisée",
										color: "#52577A",
										fontSize: 9,
										colSpan: 7,
									},
									{},
									{},
									{},
									{},
									{},
									{},
								],
							],
							layout: {
								hLineWidth() {
									return 0;
								},
								vLineWidth() {
									return 0;
								},
								paddingTop(rowIndex) {
									return rowIndex === 0 ? 6 : 2;
								},
								paddingBottom(rowIndex, _node, group) {
									return rowIndex === group.rowCount - 1 ? 6 : 2;
								},
							},
						},
						{
							keepTogether: true,
							dontBreakRows: true,
							rows: [
								[
									{
										stack: [
											{
												text: "Capteurs environnementaux",
												fontSize: 10,
											},
											{
												text: "Ref: ENV-SENS-24",
												color: "#52577A",
												fontSize: 9,
												margin: [0, 0, 0, 5],
											},
										],
									},
									{
										text: "24",
										alignment: "center",
										fontSize: 9,
									},
									{
										text: "Unités",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "285,00 €",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "20%",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "6 840,00 €",
										alignment: "right",
										fontSize: 9,
									},
									{
										text: "8 208,00 €",
										alignment: "right",
										fontSize: 9,
									},
								],
								[
									{
										text: "Fourniture et pose de capteurs CO₂, particules, température et humidité.\n\nInclus :\n- Installation sur site\n- Intégration réseau sécurisée\n- Calibration et recette",
										color: "#52577A",
										fontSize: 9,
										colSpan: 7,
									},
									{},
									{},
									{},
									{},
									{},
									{},
								],
							],
							layout: {
								hLineWidth() {
									return 0;
								},
								vLineWidth() {
									return 0;
								},
								paddingTop(rowIndex) {
									return rowIndex === 0 ? 6 : 2;
								},
								paddingBottom(rowIndex, _node, group) {
									return rowIndex === group.rowCount - 1 ? 6 : 2;
								},
							},
						},
						{
							keepTogether: true,
							dontBreakRows: true,
							rows: [
								[
									{
										stack: [
											{
												text: "Formation cybersécurité terrain",
												fontSize: 10,
											},
											{
												text: "Ref: FORM-SEC-08",
												color: "#52577A",
												fontSize: 9,
											},
										],
									},
									{
										text: "2",
										alignment: "center",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "Jours",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "1 200,00 €",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "20%",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "2 400,00 €",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
									{
										text: "2 880,00 €",
										alignment: "right",
										color: "#222222",
										fontSize: 9,
									},
								],
								[
									{
										text: "Atelier pratique pour les équipes locales : détection d’incidents, bonnes pratiques d’accès et exercices de réponse.\n\nInclus :\n- Support pédagogique\n- Supports numériques\n- Compte-rendu de session",
										color: "#52577A",
										fontSize: 9,
										colSpan: 7,
									},
									{},
									{},
									{},
									{},
									{},
									{},
								],
							],
							layout: {
								hLineWidth() {
									return 0;
								},
								vLineWidth() {
									return 0;
								},
								paddingTop(rowIndex) {
									return rowIndex === 0 ? 6 : 2;
								},
								paddingBottom(rowIndex, _node, group) {
									return rowIndex === group.rowCount - 1 ? 6 : 2;
								},
							},
						},
					],
					layout: {
						vLineWidth(index, node) {
							return index === 0 || index === node.table.widths.length ? 0.5 : 0;
						},
						vLineColor() {
							return "#E3E3E8";
						},
						hLineWidth(index, node) {
							return 0.5;
						},
						hLineColor() {
							return "#E3E3E8";
						},
						paddingTop(rowIndex, node) {
							return 8;
						},
						paddingBottom(rowIndex, node) {
							return 8;
						},
						paddingLeft(colIndex) {
							return colIndex === 0 ? 10 : 8;
						},
						paddingRight(colIndex, node) {
							return colIndex === node.table.widths.length - 1 ? 10 : 8;
						},
					},
				},
			},
		},
		{
			unbreakable: true,
			margin: [0, 10, 0, 0],
			columns: [
				{
					width: "*",
					stack: [
						{
							text: "Livraison de biens",
							color: "#52577A",
							bold: true,
							fontSize: 8,
							margin: [0, 10, 0, 0],
						},
						{
							text: "Détails TVA",
							color: "#101010",
							bold: true,
							fontSize: 8,
							margin: [0, 10, 0, 0],
						},
						{
							noWrap: true,
							table: {
								widths: ["auto", "auto", "auto"],
								header: {
									rows: [
										[
											{
												text: "Taux",
												style: "tableHeader",
												alignment: "left",
												color: "#52577A",
												fontSize: 8,
												bold: false,
											},
											{
												text: "Montant TVA",
												style: "tableHeader",
												alignment: "right",
												color: "#52577A",
												fontSize: 8,
												bold: false,
											},
											{
												text: "Base HT",
												style: "tableHeader",
												alignment: "right",
												color: "#52577A",
												fontSize: 8,
												bold: false,
											},
										],
									],
									layout: {
										fillColor() {
											return 0;
										},
										vLineWidth() {
											return 0;
										},
										vLineColor() {
											return 0;
										},
										hLineWidth() {
											return 0;
										},
										hLineColor() {
											return 0;
										},
										paddingLeft(columnIndex) {
											return columnIndex === 0 ? 0 : 10;
										},
										paddingRight(columnIndex, node) {
											const lastColumn = node.table.widths.length - 1;
											return columnIndex === lastColumn ? 0 : 10;
										},
									},
								},
								body: {
									groups: [
										{
											keepTogether: true,
											dontBreakRows: true,
											rows: [
												[
													{
														text: "20%",
														alignment: "left",
													},
													{
														text: "6 270,00 €",
														alignment: "right",
													},
													{
														text: "31 350,00 €",
														alignment: "right",
													},
												],
												[
													{
														text: "5.5%",
														alignment: "left",
													},
													{
														text: "1 729,28 €",
														alignment: "right",
													},
													{
														text: "9 570,72 €",
														alignment: "right",
													},
												],
											],
										},
									],
									layout: {
										vLineWidth(index, node) {
											return 0;
										},
										vLineColor() {
											return 0;
										},
										hLineWidth(index, node) {
											return 0;
										},
										hLineColor() {
											return 0;
										},
										paddingLeft(columnIndex) {
											return columnIndex === 0 ? 0 : 10;
										},
										paddingRight(columnIndex, node) {
											const lastColumn = node.table.widths.length - 1;
											return columnIndex === lastColumn ? 0 : 10;
										},
									},
								},
							},
						},
					],
				},
				{
					width: "auto",
					table: {
						borderRadius: 10,
						widths: ["auto"],
						body: {
							groups: [
								{
									keepTogether: true,
									dontBreakRows: true,
									rows: [
										[
											{
												stack: [
													{
														text: "Récapitulatif",
														color: "#52577A",
														bold: true,
														fontSize: 8,
														margin: [0, 0, 0, 10],
													},
													{
														noWrap: true,
														table: {
															widths: ["auto", "auto"],

															body: {
																groups: [
																	{
																		rows: [
																			["Total HT", "32 430,00 €"],
																			["Remise sur total HT", "-1 080,00 €"],
																			["Total HT final", "31 350,00 €"],
																			["Total TVA", "6 270,00 €"],
																			[
																				{
																					text: "Total TTC",
																					color: "#52577A",
																					margin: [0, 5, 0, 0],
																				},
																				{
																					text: "37 620,00 €",
																					color: "#52577A",
																					margin: [0, 5, 0, 0],
																				},
																			],
																		],
																	},
																],
																layout: {
																	hLineWidth(index) {
																		return index === 4 ? 1 : 0;
																	},
																	hLineColor(index) {
																		return index === 4 ? "#C8CDF5" : "transparent";
																	},
																	vLineWidth() {
																		return 0;
																	},
																	paddingLeft(columnIndex) {
																		return columnIndex === 0 ? 0 : 30;
																	},
																	paddingRight(columnIndex, node) {
																		const lastColumn = node.table.widths.length - 1;
																		return columnIndex === lastColumn ? 0 : 30;
																	},
																},
															},
														},
													},
												],
											},
										],
									],
								},
							],

							layout: {
								fillColor() {
									return "#EBEDFF";
								},

								hLineWidth() {
									return 1;
								},

								vLineWidth() {
									return 1;
								},

								hLineColor() {
									return "#C8CDF5";
								},

								vLineColor() {
									return "#C8CDF5";
								},

								paddingLeft() {
									return 10;
								},

								paddingRight() {
									return 10;
								},

								paddingTop() {
									return 10;
								},

								paddingBottom() {
									return 5;
								},
							},
						},
					},
				},
			],
		},
		{
			unbreakable: true,
			margin: [0, 10, 0, 0],
			columnGap: 20,
			columns: [
				{
					width: "*",
					borderRadius: 8,
					borderWidth: 1,
					borderColor: "#E3E3E8",
					padding: 12,
					stack: [
						{
							text: "Informations de paiement",
							color: "#101010",
							fontSize: 9,
							bold: true,
							margin: [0, 0, 0, 5],
						},
						{
							text: "Banque",
							color: "#52577A",
							fontSize: 8,
						},
						{
							text: "Banque Populaire",
							color: "#101010",
							fontSize: 10,
						},
						{
							text: "IBAN",
							color: "#52577A",
							fontSize: 8,
						},
						{
							text: "FR76 3000 4000 0100 0001 2345 678",
							color: "#101010",
							fontSize: 10,
						},
						{
							text: "BIC",
							color: "#52577A",
							fontSize: 8,
						},
						{
							text: "LUMNFRPPXXX",
							color: "#101010",
							fontSize: 10,
						},
					],
				},
				{
					width: "*",
					borderRadius: 8,
					borderWidth: 1,
					borderColor: "#E3E3E8",
					padding: 12,
					stack: [
						{
							text: "Notes :",
							color: "#101010",
							fontSize: 8,
							margin: [0, 0, 0, 5],
							bold: true,
						},
						{
							text: "Validité du devis : 30 jours. Délai de livraison indicatif : 6 semaines après signature.",
							color: "#222222",
							fontSize: 8,
						},
					],
				},
			],
		},
		{
			margin: [0, 15, 0, 0],
			stack: [
				{
					text: "Option de paiement de la TVA sur les débits",
					color: "#52577A",
					fontSize: 8,
					margin: [0, 0, 0, 5],
				},
				{
					text: "En cas de retard de paiement, des pénalités de retard seront exigibles à compter du jour suivant la date d'échéance figurant sur le devis. Le taux d'intérêt des pénalités de retard est égal à trois fois le taux d'intérêt légal, conformément à l'article L441-10 du Code de commerce. Une indemnité forfaitaire de 40 € sera alors appliquée pour les frais de recouvrement. Escompte pour paiement anticipé : néant",
					color: "#52577A",
					fontSize: 8,
					margin: [0, 0, 0, 5],
				},
				{
					text: "Capital social : 50 000 € · Code NAF 62.01Z · N° SIRET 81245678900024 · 812 456 789 R.C.S. Bordeaux · N° de TVA FR45812456789",
					color: "#52577A",
					fontSize: 8,
					margin: [0, 0, 0, 5],
				},
			],
		},
	],
	footer(currentPage, pageCount) {
		return {
			columns: [
				{
					text: "Lumen Atelier SAS · D-2026-0842",
					alignment: "left",
				},
				{
					text: `${currentPage} / ${pageCount}`,
					alignment: "right",
				},
			],
			fontSize: 8,
			color: "#777777",
			margin: [24, 0, 24, 0],
		};
	},
	styles: {
		companyName: {
			fontSize: 16,
			bold: true,
			margin: [0, 0, 0, 8],
		},
		invoiceTitle: {
			fontSize: 24,
			bold: true,
			alignment: "right",
			margin: [0, 0, 0, 12],
		},
		sectionTitle: {
			fontSize: 12,
			bold: true,
			color: "#333333",
			margin: [0, 0, 0, 0],
		},
		tableHeader: {
			bold: true,
			color: "#52577A",
			fontSize: 8,
			noWrap: true,
		},
		total: {
			fontSize: 12,
			bold: true,
		},
	},
	defaultStyle: {
		font: "Figtree",
		fontSize: 10,
		lineHeight: 1.25,
		color: "#222222",
	},
};
