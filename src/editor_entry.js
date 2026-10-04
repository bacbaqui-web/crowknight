import './editor_local_only_helper.js';

// Loading the editor runtime is conditional on the local-host guard succeeding.
await import('./main.js');
