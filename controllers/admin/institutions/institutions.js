const Institution = require("../../../models/Institution/Institution");

exports.createInstitution = async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      location,
      departments,
      tags,
      contactEmail,
      contactPhone,
    } = req.body;
    const inst = await Institution.create({
      name,
      type,
      description,
      location,
      departments,
      tags,
      contactEmail,
      contactPhone,
      createdBy: req.user.id,
    });
    return res.status(201).json({ success: true, institution: inst });
  } catch (err) {
    console.error("Create institution error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.listInstitutions = async (req, res) => {
  try {
    let {
      q,
      type,
      city,
      state,
      country,
      isActive,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};

    if (q && q.trim()) {
      filter.name = { $regex: q.trim(), $options: "i" };
    }

    if (type) filter.type = type;

    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    if (city) filter["location.city"] = { $regex: city, $options: "i" };
    if (state) filter["location.state"] = { $regex: state, $options: "i" };
    if (country)
      filter["location.country"] = { $regex: country, $options: "i" };

    const sortOrder = order === "asc" ? 1 : -1;
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    const items = await Institution.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Institution.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Institutions fetched successfully",
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      filtersUsed: filter,
    });
  } catch (err) {
    console.log("Error fetching institutions:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
