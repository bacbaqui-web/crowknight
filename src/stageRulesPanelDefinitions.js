export const STAGE_RULES_PANEL_DEFINITIONS = Object.freeze([
  {
    key: 'progression',
    title: '진행',
    fields: [
      {
        type: 'select',
        id: 'progressionMode',
        label: '진행 방식',
        options: [
          { value: 'endless', label: 'Endless' },
          { value: 'fixed', label: 'Fixed' },
        ],
      },
      {
        type: 'rangeNumber',
        label: '제한 시간',
        rangeId: 'progressionDurationSec',
        numberId: 'progressionDurationSecNumber',
        min: 1,
        max: 3600,
        step: 1,
      },
      {
        type: 'summary',
        id: 'progressionRulesFields',
      },
    ],
  },
  {
    key: 'enemy',
    title: '적',
    fields: [
      {
        type: 'select',
        id: 'enemySpawnMode',
        label: '스폰 방식',
        options: [
          { value: 'cameraRespawn', label: 'Camera Respawn' },
          { value: 'interval', label: 'Interval' },
          { value: 'wave', label: 'Wave' },
        ],
      },
      {
        type: 'summary',
        id: 'enemyRulesFields',
      },
    ],
  },
  {
    key: 'reward',
    title: '보상',
    fields: [
      {
        type: 'summary',
        id: 'rewardRulesFields',
      },
    ],
  },
  {
    key: 'score',
    title: '점수',
    fields: [
      {
        type: 'summary',
        id: 'scoreRulesFields',
      },
    ],
  },
]);
