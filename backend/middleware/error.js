exports.notFound = (req, res) => res.status(404).json({ message: 'Route not found.' });

exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500, message = err.message;
  if (err.code === 'ER_DUP_ENTRY') { status = 409; message = 'A record with the same unique value already exists.'; }
  else if (err.code === 'ER_NO_REFERENCED_ROW_2') { status = 400; message = 'A referenced record does not exist.'; }
  else if (err.code === 'ER_ROW_IS_REFERENCED_2') { status = 409; message = 'This record is referenced by other data (for example protected biometric records). Archive it instead of deleting.'; }
  else if (err.code === 'ER_TRUNCATED_WRONG_VALUE' || err.code === 'ER_WRONG_VALUE') { status = 400; message = 'Invalid date or value.'; }
  else if (err.sqlState === '45000') { status = 403; message = 'This record is protected and cannot be changed.'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body.'; }
  else if (status >= 500) { console.error(err); message = 'Internal server error.'; }
  res.status(status).json({ message });
};
