export const UPGRADE_CARDS = Object.freeze(
  [
    {
      id: 'sharp-blade',
      name: '예리한 칼날',
      stat: '공격 피해',
      amount: 1,
      unit: '',
      icon: './assets/icons/upgrades/sharp-blade.svg',
    },
    {
      id: 'steel-feathers',
      name: '강인한 심장',
      stat: '최대 체력',
      amount: 1,
      unit: '칸',
      icon: './assets/icons/upgrades/steel-feathers.svg',
    },
    {
      id: 'crow-footsteps',
      name: '바람걸음',
      stat: '이동 속도',
      amount: 10,
      unit: '%',
      icon: './assets/icons/upgrades/crow-footsteps.svg',
    },
    {
      id: 'long-shadow',
      name: '길어진 칼끝',
      stat: '근접 공격 범위',
      amount: 10,
      unit: '%',
      icon: './assets/icons/upgrades/long-shadow.svg',
    },
    {
      id: 'forceful-strike',
      name: '격퇴의 일격',
      stat: '공격 밀어내기',
      amount: 20,
      unit: '%',
      icon: './assets/icons/upgrades/forceful-strike.svg',
    },
    {
      id: 'rooted-stance',
      name: '굳건한 버팀',
      stat: '받는 밀어내기',
      amount: -15,
      unit: '%',
      icon: './assets/icons/upgrades/rooted-stance.svg',
    },
    {
      id: 'unyielding-will',
      name: '끊어진 족쇄',
      stat: '피격 경직 시간',
      amount: -10,
      unit: '%',
      icon: './assets/icons/upgrades/unyielding-will.svg',
    },
    {
      id: 'swift-preparation',
      name: '섬광의 선공',
      stat: '공격 준비 시간',
      amount: -10,
      unit: '%',
      icon: './assets/icons/upgrades/swift-preparation.svg',
    },
    {
      id: 'seamless-finish',
      name: '흐르는 연격',
      stat: '공격 후딜레이',
      amount: -10,
      unit: '%',
      icon: './assets/icons/upgrades/seamless-finish.svg',
    },
    {
      id: 'leaping-feather',
      name: '솟구치는 도약',
      stat: '점프 높이',
      amount: 10,
      unit: '%',
      icon: './assets/icons/upgrades/leaping-feather.svg',
    },
  ].map(Object.freeze)
);

export function upgradeEffectLabel(card, count = 1) {
  const raw = card.amount * count;
  const value = card.amount < 0 ? Math.max(-80, raw) : raw;
  return `${card.stat} ${value > 0 ? '+' : ''}${value}${card.unit}`;
}
