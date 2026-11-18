// Barre de mouvement : amplitude normale, zone douloureuse hachurée, amplitude maximale du patient.
export function AngleTrack({ label, min, max, value, onChange, pain, rom, unit = '°', status }: {
  label: string; min: number; max: number; value: number; onChange: (v: number) => void
  pain?: [number, number] | null; rom?: [number, number] | null; unit?: string; status?: string | null
}) {
  const pct = (v: number) => `${((v - min) / (max - min)) * 100}%`
  const inPain = !!pain && value >= pain[0] && value <= pain[1]
  return (
    <div className="atrack">
      <div className="atrack-head"><span className="lbl">{label}</span><b className={inPain ? 'bad' : ''}>{value}{unit}{status ? ` · ${status}` : ''}</b></div>
      <div className="atrack-rail">
        {rom && rom[1] < max && <span className="atrack-out" style={{ left: pct(rom[1]), right: 0 }} />}
        {rom && rom[0] > min && <span className="atrack-out" style={{ left: 0, width: pct(rom[0]) }} />}
        {pain && <span className="atrack-pain" style={{ left: pct(pain[0]), width: `calc(${pct(pain[1])} - ${pct(pain[0])})` }} />}
        <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} aria-label={label} />
      </div>
      <div className="atrack-ticks">
        {(!pain || (pain[0] - min) / (max - min) > 0.1) && <span style={{ left: 0 }}>{min}{unit}</span>}
        {pain && (pain[1] - pain[0]) / (max - min) < 0.18
          ? <span style={{ left: pct((pain[0] + pain[1]) / 2) }} className="bad">{pain[0]}–{pain[1]}{unit}</span>
          : pain && <><span style={{ left: pct(pain[0]) }} className="bad">{pain[0]}{unit}</span><span style={{ left: pct(pain[1]) }} className="bad">{pain[1]}{unit}</span></>}
        {rom && rom[1] < max && (!pain || Math.abs(rom[1] - pain[1]) / (max - min) > 0.12) && <span style={{ left: pct(rom[1]) }}>max {rom[1]}{unit}</span>}
        {(!rom || (max - rom[1]) / (max - min) > 0.14) && (!pain || (max - pain[1]) / (max - min) > 0.1) && <span style={{ right: 0 }}>{max}{unit}</span>}
      </div>
    </div>
  )
}
