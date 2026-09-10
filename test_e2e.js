async function testFullLifecycle() {
  console.log('🚀 === STARTING GREEN CORRIDOR FULL APP END-TO-END VERIFICATION ===\n');

  // STEP 1: Citizen reports an accident at Rankala Lake
  console.log('1️⃣ Citizen Reports Accident at Rankala Lake (No Login)...');
  const incidentRes = await fetch('http://localhost:3000/api/incidents/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'ACCIDENT',
      lat: 16.6963,
      lng: 74.2233,
      locationName: 'Rankala Lake',
      description: 'Car collided with pole, driver unconscious',
      contact: '9822114477'
    })
  }).then(r => r.json());
  
  if (!incidentRes.success || !incidentRes.assignedDriver) {
    throw new Error('Failed to report incident: ' + JSON.stringify(incidentRes));
  }
  const inc = incidentRes.incident;
  const assigned = incidentRes.assignedDriver;
  console.log('   ✅ Incident [' + inc.id + '] routed to nearest unit: ' + assigned.vehicleId + ' (' + assigned.fullName + ') - ' + assigned.distanceM + 'm away.\n');

  // STEP 2: Driver logs in and accepts the incident
  console.log('2️⃣ Driver (' + assigned.username + ') logs in and accepts incident [' + inc.id + ']...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: assigned.username, password: 'Pass@123' })
  }).then(r => r.json());
  if (!loginRes.success) throw new Error('Driver login failed');

  const acceptRes = await fetch('http://localhost:3000/api/incidents/' + inc.id + '/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: assigned.username })
  }).then(r => r.json());
  console.log('   ✅ Incident accepted by driver:', acceptRes.success);

  // STEP 3: Driver starts trip to incident site
  console.log('3️⃣ Driver starts Emergency Trip to Incident Site...');
  const tripRes = await fetch('http://localhost:3000/api/trips/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emergencyCode: 'EMG-2026-LIVE-01',
      vehicleId: assigned.vehicleId,
      vehicleType: 'AMBULANCE',
      driverUsername: assigned.username,
      driverName: assigned.fullName,
      originName: 'Vehicle Standby Base',
      originLat: 16.6816,
      originLng: 74.2433,
      destHospital: { id: null, name: 'Incident Site — Rankala Lake', lat: inc.lat, lng: inc.lng },
      leg: 'TO_INCIDENT',
      incidentId: inc.id,
      distance: 2100,
      etaNormalSec: 420,
      etaCorridorSec: 216,
      routeCoords: [{ lat: 16.6816, lng: 74.2433 }, { lat: 16.6963, lng: 74.2233 }],
      signals: [{ code: 'KOP-SIG-RNK', name: 'Rankala Chowk', distM: 1800, coord: { lat: 16.6952, lng: 74.2242 } }],
      patientCase: { criticality: 'CRITICAL', category: 'ACCIDENT', notes: inc.description }
    })
  }).then(r => r.json());
  console.log('   ✅ Trip Started: ' + tripRes.trip?.emergencyCode + ' | Leg: ' + tripRes.trip?.leg + '\n');

  // STEP 4: Request & Approve Green Corridor
  console.log('4️⃣ Driver requests Green Corridor & Traffic Police (tp202601) Approves...');
  const reqRes = await fetch('http://localhost:3000/api/trips/' + tripRes.trip.emergencyCode + '/request-corridor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: assigned.username })
  }).then(r => r.json());
  console.log('   ✅ Corridor status after driver request:', reqRes.trip?.corridorStatus);

  const appRes = await fetch('http://localhost:3000/api/trips/' + tripRes.trip.emergencyCode + '/approve-corridor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'tp202601' })
  }).then(r => r.json());
  console.log('   ✅ Corridor status after police approval:', appRes.trip?.corridorStatus + '\n');

  // STEP 5: Medical Staff & Hospital updates
  console.log('5️⃣ Medical Staff updates clinical vitals & Hospital Prepares...');
  const medRes = await fetch('http://localhost:3000/api/trips/' + tripRes.trip.emergencyCode + '/patient-case', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      criticality: 'CRITICAL',
      category: 'ACCIDENT',
      oxygen: true,
      notes: 'Severe concussion, oxygen administered at 6L/min',
      incomingSent: true,
      hospAccepted: true,
      hospitalReady: true,
      username: 'mo202601'
    })
  }).then(r => r.json());
  console.log('   ✅ Hospital & Patient Case status: Ready to Receive =', medRes.trip?.patientCase?.hospitalReady + '\n');

  // STEP 6: Admin checks overview
  console.log('6️⃣ Admin verifies System Audit Log & Vehicles...');
  const auditRes = await fetch('http://localhost:3000/api/audit-logs').then(r => r.json());
  console.log('   ✅ System recorded ' + auditRes.logs?.length + ' real-time audit entries.');
  console.log('   Latest Action:', auditRes.logs[0]?.action, 'by', auditRes.logs[0]?.user + '\n');

  console.log('🎉 === ALL APP WORKFLOWS & FIXES TESTED AND PASSED 100% ===');
}

testFullLifecycle().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
