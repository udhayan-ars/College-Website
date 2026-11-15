const Dashboard = require('../models/Dashboard');
const { asyncHandler } = require('../utils/errors');
const { hostelScope } = require('../utils/access');

exports.summary = asyncHandler(async (req, res) => res.json(await Dashboard.summary(hostelScope(req))));
