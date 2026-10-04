export const UPGRADE_CARDS = Object.freeze(
  [
    {
      id: 'sharp-blade',
      name: '날카로운 칼날',
      stat: '공격 피해',
      amount: 1,
      unit: '',
      icon: './assets/icons/upgrades/sharp-blade.svg',
    },
    {
      id: 'steel-feathers',
      name: '강철 깃털',
      stat: '최대 체력',
      amount: 1,
      unit: '칸',
      icon: './assets/icons/upgrades/steel-feathers.svg',
    },
    {
      id: 'crow-footsteps',
      name: '까마귀의 발걸음',
      stat: '이동 속도',
      amount: 10,
      unit: '%',
      icon: './assets/icons/upgrades/crow-footsteps.svg',
    },
    {
      id: 'long-shadow',
      name: '긴 그림자',
      stat: '근접 공격 범위',
      amount: 10,
      unit: '%',
      icon: './assets/icons/upgrades/long-shadow.svg',
    },
    {
      id: 'forceful-strike',
      name: '거센 일격',
      stat: '공격 밀어내기',
      amount: 20,
      unit: '%',
      icon: './assets/icons/upgrades/forceful-strike.svg',
    },
    {
      id: 'rooted-stance',
      name: '뿌리내린 자세',
      stat: '받는 밀어내기',
      amount: -15,
      unit: '%',
      icon: './assets/icons/upgrades/rooted-stance.svg',
    },
    {
      id: 'unyielding-will',
      name: '불굴의 의지',
      stat: '피격 경직 시간',
      amount: -10,
      unit: '%',
      icon: './assets/icons/upgrades/unyielding-will.svg',
    },
    {
      id: 'swift-preparation',
      name: '재빠른 준비',
      stat: '공격 준비 시간',
      amount: -10,
      unit: '%',
      icon: './assets/icons/upgrades/swift-preparation.svg',
    },
    {
      id: 'seamless-finish',
      name: '빈틈없는 마무리',
      stat: '공격 후딜레이',
      amount: -10,
      unit: '%',
      icon: './assets/icons/upgrades/seamless-finish.svg',
    },
    {
      id: 'leaping-feather',
      name: '도약하는 깃털',
      stat: '점프 높이',
      amount: 10,
      unit: '%',
      icon: './assets/icons/upgrades/leaping-feather.svg',
    },
  ].map(Object.freeze)
);

export function upgradeEffectLabel(card, count = 1) {
  const value = card.amount * count;
  return `${card.stat} ${value > 0 ? '+' : ''}${value}${card.unit}`;
}
