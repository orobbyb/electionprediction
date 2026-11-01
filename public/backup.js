/* Shared browser/Node validation; never sends predictions to a server. */
(function (root) {
  function validate(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.predictions) || !Array.isArray(value.history)) {
      throw new Error('Choose a prediction-board JSON export containing predictions and history.');
    }
    if (value.schemaVersion != null && value.schemaVersion !== 1) throw new Error('Unsupported backup version.');
    for (const [name, records] of [['predictions', value.predictions], ['history', value.history]]) {
      if (records.length > 10000) throw new Error('This backup contains too many records.');
      const ids = new Set();
      for (const item of records) {
        if (!item || typeof item !== 'object') throw new Error('Invalid backup record.');
        for (const key of ['id', 'state', 'type', 'winner', 'party', 'date', 'updatedAt', 'district', 'notes', 'confidence']) {
          if (typeof item[key] !== 'string') throw new Error('Invalid or missing field: ' + key);
        }
        if (!/^[\w-]+$/.test(item.id) || !['Senate', 'Governor', 'House'].includes(item.type) ||
            !['Democrat', 'Republican', 'Independent', 'Other'].includes(item.party) ||
            !['Low', 'Medium', 'High'].includes(item.confidence) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(Date.parse(item.updatedAt))) {
          throw new Error('Invalid prediction details.');
        }
        if (name === 'history' && (typeof item.historyId !== 'string' || !/^[\w-]+$/.test(item.historyId) ||
            typeof item.savedAt !== 'string' || !Number.isFinite(Date.parse(item.savedAt)))) {
          throw new Error('Invalid history details.');
        }
        const id = name === 'history' ? item.historyId : item.id;
        if (ids.has(id)) throw new Error('Duplicate record ID in backup.');
        ids.add(id);
      }
    }
    return {predictions: value.predictions, history: value.history};
  }
  function parse(text) {
    if (text.length > 10 * 1024 * 1024) throw new Error('Backup must be smaller than 10 MB.');
    return validate(JSON.parse(text));
  }
  function serialize(data) {
    validate(data);
    return JSON.stringify({schemaVersion: 1, exportedAt: new Date().toISOString(), ...data}, null, 2);
  }
  root.BoardBackup = {validate, parse, serialize};
})(globalThis);
