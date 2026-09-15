export const notificationTones = {
  bell: 'Classic bell',
  double: 'Double bell',
  chime: 'Bright chime',
}

export function soundPreferences(value = {}) {
  return {
    enabled: value?.enabled === true,
    tone: Object.hasOwn(notificationTones, value?.tone) ? value.tone : 'bell',
    volume: Number.isFinite(value?.volume) ? Math.max(0, Math.min(100, value.volume)) : 85,
  }
}

// Generate bell harmonics locally; no audio downloads are needed.
export function playNotificationSound(context, preferences) {
  const { tone, volume } = soundPreferences(preferences)
  if (context.state !== 'running' || volume === 0) return () => {}
  const notes = tone === 'double' ? [[0, 880], [0.45, 880]]
    : tone === 'chime' ? [[0, 784], [0.25, 1046], [0.5, 1318]] : [[0, 880]]
  const nodes = []
  for (const [delay, frequency] of notes) {
    for (const [harmonic, level] of [[1, 0.45], [2.76, 0.18], [4.07, 0.07]]) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime + delay
      oscillator.frequency.value = frequency * harmonic
      oscillator.connect(gain)
      gain.connect(context.destination)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(level * volume / 100, start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.5)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      oscillator.start(start)
      oscillator.stop(start + 1.55)
      nodes.push([oscillator, gain])
    }
  }
  return () => nodes.forEach(([oscillator, gain]) => {
    gain.disconnect()
    try { oscillator.stop() } catch { /* Already stopped. */ }
  })
}
