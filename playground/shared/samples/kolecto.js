export default {
	version: "1.7",
	subset: "PDF/A-3b",
	tagged: true,
	displayTitle: true,
	pageSize: "A4",
	pageMargins: [24, 24, 24, 24],

	info: {
		title: "Facture QZ-8741",
		author: "Orbe & Sève SAS",
		subject: "Facture Atelier Quasar",
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
						{ text: "08/01/2023", font: "FigtreeSemiBold" },
					],
					margin: [0, 0, 0, 0],
					alignment: "left",
				},
				{
					width: "auto",
					stack: [
						{ text: "Date d'expiration", color: "#52577A", fontSize: 9 },
						{ text: "08/01/2023", font: "FigtreeSemiBold" },
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
					text: "Devis N°D-2026-018",
					bold: true,
					fontSize: 15,
				},
				{
					text: "Bon de commande N°46374",
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
							text: "Orbe & Sève SAS",
							fontSize: 15,
						},
						{
							text: "7 passage des Lucioles",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "44000 Nantes, France",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "entreprise@mail.com",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "06 12 34 56 78",
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
							text: "Atelier Quasar SARL",
							fontSize: 15,
						},
						{
							text: "42 quai des Météores",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "69007 Lyon, France",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "SIREN : 582 947 130",
							color: "#52577A",
							fontSize: 9,
						},
						{
							text: "N° de TVA : FR61 582 947 130",
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
					text: "Titre personnalisé",
					fontSize: 14,
				},
				{
					text: "Description personnalisée un peu plus longue que le titre",
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
						paddingLeft() {
							return 10;
						},
						paddingRight() {
							return 10;
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
										text: "Installation de balises atmosphériques",
									},
									{
										text: "60",
										alignment: "center",
									},
									{
										text: "Jours",
										alignment: "right",
									},
									{
										text: "667,83 €",
										alignment: "right",
									},
									{
										text: "20%",
										alignment: "right",
									},
									{
										text: "10 080,00 €",
										alignment: "right",
									},
									{
										text: "50 040,00 €",
										alignment: "right",
									},
								],
								[
									{
										stack: [
											{
												text: "Ref: AZERT13249",
												color: "#52577A",
												fontSize: 9,
											},
											{
												text: "L'iPhone 17 Pro repousse à nouveau les limites de l'innovation. Taillé dans un titane de qualité aérospatiale, plus léger et plus résistant que jamais, il abrite une puissance brute prête à donner vie à toutes vos ambitions, de la création de contenus professionnels au gaming de salon.\n\nLes innovations majeures :\n- Puce A19 Pro\n- Écran Super Retina XDR avec ProMotion 2.0\n- Système photo pro ultra-avancé",
												color: "#52577A",
												fontSize: 9,
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
							],
						},
						{
							keepTogether: true,
							dontBreakRows: true,
							rows: [
								[
									{
										text: "Installation de balises atmosphériques",
									},
									{
										text: "60",
										alignment: "center",
									},
									{
										text: "Jours",
										alignment: "right",
									},
									{
										text: "667,83 €",
										alignment: "right",
									},
									{
										text: "20%",
										alignment: "right",
									},
									{
										text: "10 080,00 €",
										alignment: "right",
									},
									{
										text: "50 040,00 €",
										alignment: "right",
									},
								],
								[
									{
										stack: [
											{
												text: "Ref: AZERT13249",
												color: "#52577A",
												fontSize: 9,
											},
											{
												text: "L'iPhone 17 Pro repousse à nouveau les limites de l'innovation. Taillé dans un titane de qualité aérospatiale, plus léger et plus résistant que jamais, il abrite une puissance brute prête à donner vie à toutes vos ambitions, de la création de contenus professionnels au gaming de salon.\n\nLes innovations majeures :\n- Puce A19 Pro\n- Écran Super Retina XDR avec ProMotion 2.0\n- Système photo pro ultra-avancé",
												color: "#52577A",
												fontSize: 9,
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
							],
						},
						{
							keepTogether: true,
							dontBreakRows: true,
							rows: [
								[
									{
										text: "Installation de balises atmosphériques",
									},
									{
										text: "60",
										alignment: "center",
									},
									{
										text: "Jours",
										alignment: "right",
									},
									{
										text: "667,83 €",
										alignment: "right",
									},
									{
										text: "20%",
										alignment: "right",
									},
									{
										text: "10 080,00 €",
										alignment: "right",
									},
									{
										text: "50 040,00 €",
										alignment: "right",
									},
								],
								[
									{
										stack: [
											{
												text: "Ref: AZERT13249",
												color: "#52577A",
												fontSize: 9,
											},
											{
												text: "L'iPhone 17 Pro repousse à nouveau les limites de l'innovation. Taillé dans un titane de qualité aérospatiale, plus léger et plus résistant que jamais, il abrite une puissance brute prête à donner vie à toutes vos ambitions, de la création de contenus professionnels au gaming de salon.\n\nLes innovations majeures :\n- Puce A19 Pro\n- Écran Super Retina XDR avec ProMotion 2.0\n- Système photo pro ultra-avancé",
												color: "#52577A",
												fontSize: 9,
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
							],
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
							const headerRows = node.table.headerRows;
							const lastBoundary = node.table.body.length;

							// Bas du tableau
							if (index === lastBoundary) {
								return 0.5;
							}

							// Index relatif au body, sans compter le header
							const bodyBoundary = index - headerRows;

							// Une ligne après chaque groupe de deux rows
							return bodyBoundary > 0 && bodyBoundary % 2 === 0 ? 0.5 : 0;
						},
						hLineColor() {
							return "#E3E3E8";
						},

						paddingTop() {
							return 8;
						},

						paddingBottom() {
							return 8;
						},

						paddingLeft() {
							return 10;
						},

						paddingRight() {
							return 10;
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
														text: "10 080,00 €",
														alignment: "right",
													},
													{
														text: "50 040,00 €",
														alignment: "right",
													},
												],
												[
													{
														text: "5.5%",
														alignment: "left",
													},
													{
														text: "10 080,00 €",
														alignment: "right",
													},
													{
														text: "50 040,00 €",
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
														table: {
															widths: ["auto", "auto"],

															body: {
																groups: [
																	{
																		rows: [
																			["Total HT", "10 080,00 €"],
																			["Remise sur total HT", "-1 080,00 €"],
																			["Total HT final", "10 080,00 €"],
																			["Total TVA", "10 080,00 €"],
																			[
																				{
																					text: "Total TTC",
																					color: "#52577A",
																					margin: [0, 5, 0, 0],
																				},
																				{
																					text: "10 080,00 €",
																					color: "#52577A",
																					margin: [0, 5, 0, 0],
																				},
																			],
																		],
																	},
																],
																layout: {
																	hLineWidth(index) {
																		// Ligne uniquement avant « Total TTC »
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
									return 10;
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
							text: "Crédit Agricole",
							color: "#101010",
							fontSize: 10,
						},
						{
							text: "IBAN",
							color: "#52577A",
							fontSize: 8,
						},
						{
							text: "FR76 XXXX XXXX XXXX XXXX XXXX",
							color: "#101010",
							fontSize: 10,
						},
						{
							text: "BIC",
							color: "#52577A",
							fontSize: 8,
						},
						{
							text: "ORBEFRPPXXX",
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
							text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque congue nisl molestie ultricies commodo. Maecenas vel ultricies arcu. ",
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
					text: "En cas de retard de paiement, des pénalités de retard seront exigibles à compter du jour suivant la date d'échéance figurant sur la facture. Le taux d'intérêt des pénalités de retard est égal à trois fois le taux d'intérêt légal, conformément à l'article L441-10 du Code de commerce. Une indemnité forfaitaire de 40 € sera alors appliquée pour les frais de recouvrement. Escompte pour paiement anticipé : néant",
					color: "#52577A",
					fontSize: 8,
					margin: [0, 0, 0, 5],
				},
				{
					text: "Capital social : non concerné · Code NAF 58.11Z · N° SIRET 32998256500031 · 329 982 565 R.C.S. Bobigny · N° de TVA FR45329982565",
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
					text: "Nom / Raison sociale · F-2026-018",
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
			fontSize: 9,
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
