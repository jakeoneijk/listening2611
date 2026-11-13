window.RUBRIC = [
  {
    id: 'semantic',
    name: 'Semantic coherence',
    description: 'Evaluate whether the content of the continuation makes sense and logically follows the conversation in the prompt. Focus on meaning, not sound quality or voice characteristics.',
    descriptionHighlights: [
      { text: 'content of the continuation', tone: 'focus' },
      { text: 'follows the conversation in the prompt', tone: 'focus' },
      { text: 'not sound quality or voice characteristics', tone: 'exclude' }
    ],
    question: 'How meaningful is the continuation, and how well does it follow the conversation in the prompt?',
    help: 'Judge whether this is a plausible continuation, not whether it matches another sample. Focus on what is said rather than sound quality.',
    anchors: [
      'Mostly nonsensical or unrelated to the prompt.',
      'Frequently incoherent or only weakly connected to the prompt.',
      'Generally understandable and relevant, but with noticeable inconsistencies or weak responses.',
      'Coherent and relevant, with only minor lapses.',
      'Consistently meaningful, relevant, and responsive to the conversation.'
    ]
  },
  {
    id: 'turnTaking',
    name: 'Turn-taking naturalness',
    description: 'Evaluate whether speaker changes, pauses, overlaps, and brief responses such as “yeah” or “mm-hm” are naturally timed.',
    descriptionHighlights: [
      { text: 'naturally timed', tone: 'focus' }
    ],
    question: 'How natural is the timing of the interaction between the speakers?',
    help: 'Consider pauses, speaker changes, overlaps, and brief listener responses such as “yeah” or “mm-hm.” Overlaps and listener responses should be appropriate, not simply frequent.',
    anchors: [
      'The timing is severely disrupted, making the interaction difficult to follow.',
      'Frequent awkward pauses, interruptions, or overlaps disrupt the exchange.',
      'The exchange is understandable, but several timing issues feel unnatural.',
      'The exchange flows naturally, with only minor timing issues.',
      'The timing feels natural and well coordinated throughout.'
    ]
  },
  {
    id: 'speaker',
    name: 'Speaker similarity',
    description: 'Evaluate whether the voices in the continuation sound like the same speakers as in the prompt.',
    descriptionHighlights: [
      { text: 'same speakers as in the prompt', tone: 'focus' }
    ],
    question: 'How closely do the speakers’ voices in the continuation resemble their voices in the prompt?',
    help: 'Focus on voice identity, such as timbre and characteristic voice quality, rather than the words or emotion. Consider both speakers when they are audible.',
    anchors: [
      'The voices sound like different people.',
      'The voices have substantial differences from the prompt.',
      'The voices are somewhat similar, but noticeable differences remain.',
      'The voices are very similar, with only minor differences.',
      'The voices convincingly sound like the same speakers.'
    ]
  },
  {
    id: 'emotion',
    name: 'Emotional coherence',
    description: 'Evaluate whether the speakers’ emotional tone fits the conversation in the prompt and what they are saying. Stronger emotion is not necessarily better.',
    descriptionHighlights: [
      { text: 'emotional tone fits the conversation', tone: 'focus' },
      { text: 'Stronger emotion is not necessarily better', tone: 'exclude' }
    ],
    question: 'How well do the speakers’ tone and emotional expression fit the preceding conversation and what they are saying?',
    help: 'A neutral tone can receive a high score when it fits the conversation. More expressive does not necessarily mean better.',
    anchors: [
      'The emotional expression is strongly inappropriate or inconsistent.',
      'The emotional expression often feels mismatched or abrupt.',
      'The emotional expression is partly appropriate, but some mismatches are noticeable.',
      'The emotional expression generally fits, with only minor mismatches.',
      'The emotional expression consistently fits the context and develops naturally.'
    ]
  },
  {
    id: 'audio',
    name: 'Audio quality',
    description: 'Evaluate the audio quality, including any distortion or artifacts.',
    descriptionHighlights: [
      { text: 'audio quality', tone: 'focus' }
    ],
    question: 'How clear and free from distracting distortions or artifacts is the continuation?',
    help: 'Focus on the sound itself, such as distortion, buzzing, metallic sound, or unnatural breaks. Do not rate the meaning of the dialogue here.',
    anchors: [
      'Severe distortion or artifacts make the speech very difficult to hear.',
      'Frequent, distracting distortion or artifacts substantially reduce clarity.',
      'Noticeable distortion or artifacts reduce clarity to some extent.',
      'Mostly clear, with only minor distortion or artifacts.',
      'Clear and free from noticeable distracting distortion or artifacts.'
    ]
  },
  {
    id: 'overall',
    name: 'Overall conversational naturalness',
    description: 'Evaluate whether the continuation sounds like a natural conversation between two people.',
    descriptionHighlights: [
      { text: 'natural conversation between two people', tone: 'focus' }
    ],
    question: 'Overall, how much does the continuation sound like a natural conversation between two people?',
    help: 'Give your overall impression rather than calculating an average of your other scores. Evaluate this sample individually; do not rank the samples.',
    anchors: [
      'Very unnatural; it does not resemble a believable conversation.',
      'Mostly unnatural, with substantial problems.',
      'Somewhat natural, but with noticeable problems.',
      'Mostly natural and believable, with only minor problems.',
      'Consistently natural and believable.'
    ]
  }
];
