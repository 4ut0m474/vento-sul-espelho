#!/usr/bin/env bash
# Regenera os 14 avatares do FUTURO com exoesqueleto cobrindo o corpo inteiro.
# Modelo: Pollinations Flux (gratuito). Sem armas (regra Aurora).
set -u
cd "$(dirname "$0")"

BASE="stylized 3D character render in the style of Overwatch and Genshin Impact and Cyberpunk 2077 character creator, FULL BODY SHOT entire figure visible from head to feet, standing neutral pose feet shoulder-width apart arms slightly away from body palms open, ready for accessory overlay paper-doll style, brazilian cyberpunk future Aurora, FULL ROBOTIC EXOSKELETON armor covering the entire body head to toe, mecha suit with vibrant glowing neon circuits, modular armor plating on chest arms legs and helmet (helmet visor open showing clearly visible face), sleek sci-fi mechanical engineering, BRIGHT studio lighting strong key light fill light and rim light, well-lit subject every detail crisp and visible, light cyan-to-white gradient background, vivid neon blue cyan gold accents, no weapons no sword no firearm no gun no rifle, sharp focus, ultra high definition, 4k character art, octane render game character"

declare -A PROMPTS=(
  [desbravador-masculino]="young brazilian man explorer scout, $BASE, holding floating holographic map and digital compass, robotic backpack with antennas, surveyor cyborg"
  [desbravador-feminino]="young brazilian woman explorer scout, $BASE, holding floating holographic map and digital compass, robotic backpack with antennas, surveyor cyborg"
  [guerreiro-masculino]="young brazilian man defender warrior, $BASE, holding luminous energy SHIELD (defensive only), heavy mech armor with shoulder pauldrons, capoeira-inspired stance"
  [guerreiro-feminino]="young brazilian woman defender warrior, $BASE, holding luminous energy SHIELD (defensive only), heavy mech armor with shoulder pauldrons, capoeira-inspired stance"
  [mago-masculino]="young brazilian man mage techno-wizard, $BASE, holding glowing crystal staff projecting holograms, runic neon symbols floating around, mystic-tech armor"
  [mago-feminino]="young brazilian woman mage techno-wizard, $BASE, holding glowing crystal staff projecting holograms, runic neon symbols floating around, mystic-tech armor"
  [alquimista-masculino]="young brazilian man alchemist scientist, $BASE, holding floating bioluminescent potion flasks and molecule holograms, lab-mech armor with chemical tubes, smart visor"
  [alquimista-feminino]="young brazilian woman alchemist scientist, $BASE, holding floating bioluminescent potion flasks and molecule holograms, lab-mech armor with chemical tubes, smart visor"
  [sabio-masculino]="young brazilian man sage scholar, $BASE, holding ancient holographic tome with projected pages, scholar-mech armor, glowing knowledge runes, library aura"
  [sabio-feminino]="young brazilian woman sage scholar, $BASE, holding ancient holographic tome with projected pages, scholar-mech armor, glowing knowledge runes, library aura"
  [forjador-masculino]="young brazilian man builder forger, $BASE, holding glowing work hammer and 3D printing drone swarm, industrial heavy-mech armor, sparks of forge, blueprint holograms"
  [forjador-feminino]="young brazilian woman builder forger, $BASE, holding glowing work hammer and 3D printing drone swarm, industrial heavy-mech armor, sparks of forge, blueprint holograms"
  [watcher-masculino]="young brazilian man watcher observer, $BASE, holding holographic camera drone and surveillance hologram, stealth-mech armor with multiple optical sensors, vigilant pose"
  [watcher-feminino]="young brazilian woman watcher observer, $BASE, holding holographic camera drone and surveillance hologram, stealth-mech armor with multiple optical sensors, vigilant pose"
)

gerar() {
  local key="$1"
  local prompt="$2"
  local out="${key}-futuro.jpg"
  local seed=$(( $(echo "$key" | md5sum | head -c 6 | tr -dc '0-9') % 99999 + 1 ))
  [ -z "$seed" ] && seed=42
  local enc
  enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$prompt")
  local url="https://image.pollinations.ai/prompt/${enc}?width=1024&height=1536&model=flux&nologo=true&seed=${seed}"
  for tentativa in 1 2 3 4 5; do
    echo "→ $out (seed=$seed, try=$tentativa)"
    curl -sSL --max-time 180 -o "${out}.tmp" "$url"
    local sz
    sz=$(stat -c%s "${out}.tmp" 2>/dev/null || echo 0)
    # JPEG real costuma ser > 10KB; erro JSON do Pollinations vem ~1.3KB
    if [ "$sz" -gt 10000 ] && file "${out}.tmp" | grep -qiE "JPEG|JFIF"; then
      mv "${out}.tmp" "$out"
      echo "✓ $out  $sz bytes"
      return 0
    fi
    echo "  fila cheia ou erro ($sz bytes), aguardando 8s..."
    rm -f "${out}.tmp"
    sleep 8
  done
  echo "✗ $out — falhou após 5 tentativas"
  return 1
}

# Pula os que já temos no estilo bust bonito (mtime ≠ backup)
PULAR=(
  "desbravador-feminino"
  "watcher-masculino"
  "sabio-masculino"
  "guerreiro-masculino"
  "watcher-feminino"
)

for key in "${!PROMPTS[@]}"; do
  pular=false
  for p in "${PULAR[@]}"; do
    [ "$key" = "$p" ] && pular=true && break
  done
  if $pular; then
    echo "  ⤵ pulando $key (já tem no estilo bust)"
    continue
  fi
  gerar "$key" "${PROMPTS[$key]}"
  sleep 2
done
echo "FIM."
