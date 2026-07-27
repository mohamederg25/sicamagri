const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Pepiniere = require('../models/Pepiniere');
const Variete = require('../models/Variete');
const Lot = require('../models/Lot');
const Semis = require('../models/Semis');
const ProductionRule = require('../models/ProductionRule');


dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Clear existing data
    await User.deleteMany();
    await Pepiniere.deleteMany();
    await Variete.deleteMany();
    await Lot.deleteMany();
    await Semis.deleteMany();
    await ProductionRule.deleteMany();


    console.log('Data Cleared...');

    // 
    // 1. USERS
    // 
    const admin = await User.create({
      nom: 'Admin Principal',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });

    const ing1 = await User.create({
      nom: 'Ingénieur Nord',
      email: 'ingenieur1@test.com',
      password: 'password123',
      role: 'ingenieur'
    });

    const ing2 = await User.create({
      nom: 'Ingénieur Sud',
      email: 'ingenieur2@test.com',
      password: 'password123',
      role: 'ingenieur'
    });

    const emp1 = await User.create({
      nom: 'Employé Pépinière 1',
      email: 'employe1@test.com',
      password: 'password123',
      role: 'employe'
    });

    const emp2 = await User.create({
      nom: 'Employé Pépinière 2',
      email: 'employe2@test.com',
      password: 'password123',
      role: 'employe'
    });

    await User.create({
      nom: 'Visiteur 1',
      email: 'visitor1@test.com',
      password: 'password123',
      role: 'visiteur'
    });

    await User.create({
      nom: 'Visiteur 2',
      email: 'visitor2@test.com',
      password: 'password123',
      role: 'visiteur'
    });

    console.log('Users Created...');

    // 
    // 2. PEPINIERES  (champs corrigés: address, number)
    // 
    const pep1 = await Pepiniere.create({
      code: 'P0001',
      nom: 'pep baddar',
      address: 'Zone industrielle, Nord',
      number: '+212 6 00 00 00 01',
      email: 'pepbaddar@test.com',
      surface: 15,
      statut: 'actif',
      ingenieur: ing1._id
    });

    const pep2 = await Pepiniere.create({
      code: 'P0002',
      nom: 'Royales_plants',
      address: 'Route de la plaine, Centre',
      number: '+212 6 00 00 00 02',
      email: 'royalesplants@test.com',
      surface: 22.5,
      statut: 'actif',
      ingenieur: ing2._id
    });

    const pep3 = await Pepiniere.create({
      code: 'P0003',
      nom: 'al bosten',
      address: 'Quartier agricole, Sud',
      number: '+212 6 00 00 00 03',
      email: 'albosten@test.com',
      surface: 8,
      statut: 'actif',
      ingenieur: ing1._id
    });

    const pep4 = await Pepiniere.create({
      code: 'P0004',
      nom: 'tomaten',
      address: 'Parcelle 7B, Vallée Verte',
      number: '+212 6 00 00 00 04',
      email: '',
      surface: 30,
      statut: 'actif',
      ingenieur: ing1._id
    });

    const pep5 = await Pepiniere.create({
      code: 'P0005',
      nom: 'grow',
      address: '',
      number: '',
      email: '',
      surface: null,
      statut: 'non actif',
      ingenieur: ing2._id
    });

    console.log('Pepinieres Created...');

    // 
    // 3. VARIETES  (champs superflus supprimés)
    // 
    const v1 = await Variete.create({ code: 'V0001', nom: 'ercole', statut: 'active' });
    const v2 = await Variete.create({ code: 'V0002', nom: 'ercomex', statut: 'active' });
    const v3 = await Variete.create({ code: 'V0003', nom: 'h1879', statut: 'active' });
    const v4 = await Variete.create({ code: 'V0004', nom: 'h1886', statut: 'active' });
    const v5 = await Variete.create({ code: 'V0005', nom: 'h7709', statut: 'active' });
    const v6 = await Variete.create({ code: 'V0006', nom: 'h9661', statut: 'active' });
    const v7 = await Variete.create({ code: 'V0007', nom: 'SAADA', statut: 'active' });
    const v8 = await Variete.create({ code: 'V0008', nom: 'SARRA', statut: 'active' });
    const v9 = await Variete.create({ code: 'V0009', nom: 'SAVERA', statut: 'active' });
    const v10 = await Variete.create({ code: 'V0010', nom: 'TOP SPORT', statut: 'active' });
    const v11 = await Variete.create({ code: 'V0011', nom: 'VULCAN', statut: 'inactive' });

    console.log('Varietes Created...');

    // 
    // 4. SEMIS (créés avant les lots pour servir de source)
    // 
    const semis1 = await Semis.create({
      code: 'S0001',
      variete: v1._id,
      pepiniere: pep1._id,
      quantite: 5000,
      statut: 'realisee',
      createdBy: ing1._id
    });

    const semis2 = await Semis.create({
      code: 'S0002',
      variete: v2._id,
      pepiniere: pep1._id,
      quantite: 3000,
      statut: 'realisee',
      createdBy: ing1._id
    });

    const semis3 = await Semis.create({
      code: 'S0003',
      variete: v3._id,
      pepiniere: pep2._id,
      quantite: 8000,
      statut: 'en_cours',
      createdBy: ing2._id
    });

    const semis4 = await Semis.create({
      code: 'S0004',
      variete: v4._id,
      pepiniere: pep2._id,
      quantite: 4000,
      statut: 'prevue',
      createdBy: ing2._id
    });

    const semis5 = await Semis.create({
      code: 'S0005',
      variete: v5._id,
      pepiniere: pep3._id,
      quantite: 6000,
      statut: 'realisee',
      createdBy: admin._id
    });

    const semis6 = await Semis.create({
      code: 'S0006',
      variete: v6._id,
      pepiniere: pep3._id,
      quantite: 2500,
      statut: 'annulee',
      createdBy: admin._id
    });

    const semis7 = await Semis.create({
      code: 'S0007',
      variete: v7._id,
      pepiniere: pep4._id,
      quantite: 10000,
      statut: 'realisee',
      createdBy: ing1._id
    });

    console.log('Semis Created...');

    // 
    // 4.5. CYCLES DE SEMIS (ProductionRules)
    // 
    // Cycles globaux (toutes variétés) basés sur les périodes de semis (calendrier):
    // - Fin Décembre → 45-60 jours → fenêtre maturité ~15 jours
    // - Fin Janvier → 35-45 jours → fenêtre maturité ~10 jours
    // - Fin Février → 25-35 jours → fenêtre maturité ~10 jours
    // - Fin Mars → 15-25 jours → fenêtre maturité 7-10 jours
    // 
    await ProductionRule.create({ code: 'C0001', sowingPeriodLabel: 'Fin Décembre', startDate: new Date('2026-12-01'), endDate: new Date('2026-12-31'), productionMinDays: 45, productionMaxDays: 60, maturityWindowDays: 15, isActive: true, notes: 'Semis de décembre — production longue (45-60 jours)' });
    await ProductionRule.create({ code: 'C0002', sowingPeriodLabel: 'Fin Janvier', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31'), productionMinDays: 35, productionMaxDays: 45, maturityWindowDays: 10, isActive: true, notes: 'Semis de janvier — production moyenne-longue (35-45 jours)' });
    await ProductionRule.create({ code: 'C0003', sowingPeriodLabel: 'Fin Février', startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28'), productionMinDays: 25, productionMaxDays: 35, maturityWindowDays: 10, isActive: true, notes: 'Semis de février — production moyenne (25-35 jours)' });
    await ProductionRule.create({ code: 'C0004', sowingPeriodLabel: 'Fin Mars', startDate: new Date('2026-03-01'), endDate: new Date('2026-03-31'), productionMinDays: 15, productionMaxDays: 25, maturityWindowDays: 10, isActive: true, notes: 'Semis de mars — production courte (15-25 jours)' });

    console.log('ProductionRules Created...');

    // 
    // 5. LOTS - Production
    // 
    const prod1 = await Lot.create({
      code: 'R0001',
      type: 'production',
      quantite: 2000,
      dateEntree: new Date('2026-02-01'),
      source: semis1.code,
      semis: semis1._id,
      expectedReadyDateMin: new Date('2026-03-08'),
      expectedReadyDateMax: new Date('2026-03-18'),
      maturityWindowEnd: new Date('2026-04-02'),
      statut: 'pret',
    });

    const prod2 = await Lot.create({
      code: 'R0002',
      type: 'production',
      quantite: 1500,
      dateEntree: new Date('2026-02-15'),
      source: semis1.code,
      semis: semis1._id,
      expectedReadyDateMin: new Date('2026-03-12'),
      expectedReadyDateMax: new Date('2026-03-22'),
      maturityWindowEnd: new Date('2026-04-06'),
      statut: 'recolte',
      dateRecolte: new Date('2026-03-20'),
      nombrePlantsProduits: 1275,
    });

    const prod3 = await Lot.create({
      code: 'R0003',
      type: 'production',
      quantite: 3000,
      dateEntree: new Date('2026-03-01'),
      source: semis3.code,
      semis: semis3._id,
      expectedReadyDateMin: new Date('2026-03-26'),
      expectedReadyDateMax: new Date('2026-04-05'),
      maturityWindowEnd: new Date('2026-04-15'),
    });

    const prod4 = await Lot.create({
      code: 'R0004',
      type: 'production',
      quantite: 5000,
      dateEntree: new Date('2026-04-15'),
      source: semis7.code,
      semis: semis7._id,
      expectedReadyDateMin: new Date('2026-04-30'),
      expectedReadyDateMax: new Date('2026-05-10'),
      maturityWindowEnd: new Date('2026-05-20'),
    });

    console.log('Lots de production Created...');
    console.log(' Database Seeded Successfully!');
    console.log('');
    console.log(' Résumé :');
    console.log(`    Utilisateurs : 7 (1 admin, 2 ingenieurs, 2 employes, 2 visiteurs)`);
    console.log(`    Pépinières   : 5 (4 actives, 1 inactive)`);
    console.log(`    Variétés      : 11 (10 actives, 1 inactive)`);
    console.log(`    Semis         : 7`);
    console.log(`    Lots prod.   : 4 (avec dates de livraison prévues)`);
    console.log(`    Lots prod.   : 4 (en_cours, pret, recolte, en_cours)`);
    console.log('');
    console.log(' Identifiants de connexion :');
    console.log('   admin@test.com / password123 (Admin)');
    console.log('   ingenieur1@test.com / password123 (Ingénieur)');
    console.log('   ingenieur2@test.com / password123 (Ingénieur)');
    console.log('   employe1@test.com / password123 (Employé)');
    console.log('   employe2@test.com / password123 (Employé)');
    console.log('   visitor1@test.com / password123 (Visiteur)');
    console.log('   visitor2@test.com / password123 (Visiteur)');

    process.exit();
  } catch (error) {
    console.error(' Error:', error.message);
    process.exit(1);
  }
};

seed();
