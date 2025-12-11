const { AssinedModel } = require("../models/Assined-to.model");
const { Purchase } = require("../models/purchase");
const { TryCatch, ErrorHandler } = require("../utils/error");

const generateorderId = async () => {
  const lastParty = await Purchase.findOne().sort({ createdAt: -1 });

  if (!lastParty) return "OID001";
  const lastId = lastParty.order_id.replace("OID", "");
  const nextId = Number(lastId) + 1;
  return `OID${nextId.toString().padStart(3, "0")}`;
};

exports.create = TryCatch(async (req, res) => {
  try {
    const data = req.body;
    const order_id = await generateorderId();
    // const productFile = req.files?.productFile?.[0];
    // const productFilePath = productFile
    //   ? `https://rtpasbackend.deepmart.shop/images/${productFile.filename}`///
    //   : null;
    const newData = {
      ...data,
      user_id: req?.user._id,
      order_id,
      approved: false, // Always require approval, regardless of user role
      //   productFile: productFilePath,
    };

    if (req.body.sale_id) {
      const Purchase = require("../models/purchase");
      await Purchase.findByIdAndUpdate(
        req.body.sale_id,
        { sale_status: "BOM Created" },
        { new: true }
      );
    }
    await Purchase.create(newData);
    return res.status(201).json({ message: "Purchase Order Generated" });
  } catch (error) {
    console.error("Error creating purchase:", error);
    throw new ErrorHandler("Internal Server Error", 500);
  }
});

const mongoose = require("mongoose");

exports.unapproved = TryCatch(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const isSuper = !!req.user?.isSuper;
  const hasApprovalPermission = Array.isArray(req.user?.role?.permissions)
    ? req.user.role.permissions.includes("approval")
    : false;
  const canViewAllSales = isSuper || hasApprovalPermission;
  const userMatch = canViewAllSales
    ? {}
    : { user_id: new mongoose.Types.ObjectId(req.user._id) };

  const data = await Purchase.aggregate([
    { $match: { approved: false, ...userMatch } },
    {
      $lookup: {
        from: "products",
        localField: "product_id",
        foreignField: "_id",
        as: "product_id",
        pipeline: [{ $project: { name: 1, price: 1, uom: 1, current_stock:1 } }],
      },
    },
    {
      $lookup: {
        from: "parties",
        localField: "party",
        foreignField: "_id",
        as: "party",
        pipeline: [{ $project: { company_name: 1, consignee_name: 1 } }],
      },
    },
 

    { $unwind: { path: "$party", preserveNullAndEmptyArrays: true } },
    {
      $project: { 
        order_id: 1,
        product_qty: 1,
        GST: 1,
        price: 1,
        product_id: 1,  
        party: 1,
        createdAt: 1,

      },
    },
  ])
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .exec();

  return res.status(200).json({ success: true, data });
});

exports.approve = TryCatch(async (req, res) => {
  const { id } = req.params;
  const updated = await Purchase.findByIdAndUpdate(
    id,
    { approved: true },
    { new: true }
  );
  if (!updated) {
    throw new ErrorHandler("Sale not found", 404);
  }
  return res.status(200).json({ success: true, message: "Sale approved" });
});

exports.bulkApprove = TryCatch(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ErrorHandler("ids array is required", 400);
  }
  await Purchase.updateMany({ _id: { $in: ids } }, { $set: { approved: true } });
  return res
    .status(200)
    .json({ success: true, message: `Approved ${ids.length} sale(s)` });
});
exports.update = TryCatch(async (req, res) => {
  const data = req.body;
  const { id } = req.params;
  const find = await Purchase.findById(id);
  if (!find) {
    throw new ErrorHandler("data not found", 400);
  }
  await Purchase.findByIdAndUpdate(id, data);
  return res.status(201).json({ message: "Purchase Order updated" });
});

//  exports.Imagehandler = TryCatch(async (req, res)=> {
//     const { assined_to, assinedto_comment } = req.body;
//     const { id } = req.params;
//     const { filename } = req.file;
//     const find = await Purchase.findById(id);
//     if (!find) {
//       return res.status(404).json({
//         message: "data not found try again",
//       });
//     }                                                    //for second image

//     const path = `https://rtpasbackend.deepmart.shop/images/${filename}`;

//     await Purchase.findByIdAndUpdate(id, { designFile: path });

//     await AssinedModel.findByIdAndUpdate(assined_to, {
//       isCompleted: "Completed",
//       assinedto_comment,
//     });
//     return res.status(201).json({
//       message: "file uploaded successful",
//     });
//  )};
exports.Imagehandler = TryCatch(async (req, res) => {
  const { assined_to, assinedto_comment, designFile } = req.body;
  const { id } = req.params;

  if (!designFile) {
    return res.status(400).json({ message: "Design file URL is required" });
  }

  const find = await Purchase.findById(id);
  if (!find) {
    return res.status(404).json({ message: "Sale not found" });
  }

  // Save designFile URL in DB
  await Purchase.findByIdAndUpdate(id, {
    designFile: designFile,
  });

  // Update assignment status
  await AssinedModel.findByIdAndUpdate(assined_to, {
    isCompleted: "Completed",
    assinedto_comment,
  });

  return res.status(201).json({ message: "Design file uploaded successfully" });
});

exports.getAll = TryCatch(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  const isSuper = !!req.user?.isSuper;
  const userMatch = isSuper
    ? {}
    : { user_id: new mongoose.Types.ObjectId(req.user._id) };

  const data = await Purchase.aggregate([
    { $match: { ...userMatch } }, // Show all sales (approved and unapproved) in Sales Management
    {
      $lookup: {
        from: "boms",
        localField: "_id",
        foreignField: "sale_id",
        as: "boms",
        pipeline: [
          {
            $lookup: {
              from: "production-processes",
              foreignField: "bom",
              localField: "_id",
              as: "production_processes",
              pipeline: [
                {
                  $project: {
                    processes: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              is_production_started: 1,
              production_processes: 1,
              bom_name: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user_id",
        pipeline: [
          {
            $lookup: {
              from: "user-roles",
              foreignField: "_id",
              localField: "role",
              as: "role",
            },
          },
          {
            $project: {
              first_name: 1,
              role: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "customer_id",
        foreignField: "_id",
        as: "customer_id",
        pipeline: [
          {
            $project: {
              full_name: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "product_id",
        foreignField: "_id",
        as: "product_id",
        pipeline: [
          {
            $project: {
              name: 1,
              price: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "parties",
        localField: "party",
        foreignField: "_id",
        as: "party",
        pipeline: [
          {
            $project: {
              consignee_name: 2,
              contact_number: 2,
              cust_id: 1,
              company_name: 1,
              bill_to: 1,
              bill_gst_to:1,
              shipped_gst_to:1,
              shipped_to:1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$party",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "assineds",
        localField: "_id",
        foreignField: "sale_id",
        as: "assinedto",
        pipeline: [ 
          {
            $lookup: {
              from: "users",
              localField: "assined_to",
              foreignField: "_id",
              as: "assinedto",
              pipeline: [
                {
                  $lookup: {
                    from: "user-roles",
                    localField: "role",
                    foreignField: "_id",
                    as: "role",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $addFields: {
        total_price: {
          $add: [
            { $multiply: ["$price", "$product_qty"] },
            {
              $divide: [
                {
                  $multiply: [
                    { $multiply: ["$price", "$product_qty"] },
                    "$GST",
                  ],
                },
                100,
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        sale_status: 1,   // ✅ new field
        approved: 1, // Include approval status
        order_id: 1,
        price: 1,
        product_qty: 1,
        GST: 1,
        total_price: 1,
        user_id: 1,
        customer_id: 1,
        product_id: 1,
        party: 1,
        assinedto: 1,
        boms: 1,
        mode_of_payment: 1,
        createdAt: 1,
        terms_of_delivery: 1,
      },
    },
  ])
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .exec();

  return res.status(200).json({ message: "all purchases order found", data });
});

exports.AddToken = TryCatch(async (req, res) => {
  const { id } = req.params;
  const { token_amt } = req.body;

  if (!token_amt) {
    return res.status(404).json({
      message: "token amount is required!",
    });
  }

  if (!id) {
    return res.status(404).json({
      message: "couldn't access the sale!",
    });
  }

  await Purchase.findByIdAndUpdate(id, {
    token_amt,
    token_status: false,
  });

  return res.status(200).json({
    message: "Token Amount added for sample :)",
  });
});


exports.markProductionCompleted = TryCatch(async (req, res) => {
  const { id } = req.params;
  const updated = await Purchase.findByIdAndUpdate(
    id,
    { salestatus: "Production Completed" },
    { new: true }
  );
  if (!updated) {
    throw new ErrorHandler("Sale not found", 404);
  }
  return res.status(200).json({ success: true, message: "Order marked as production completed" });
});

exports.getUpcomingSales = TryCatch(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const data = await Purchase.aggregate([
    { $match: { 
      approved: true,
      $or: [
        { salestatus: { $ne: "Production Completed" } },
        { salestatus: { $exists: false } }
      ]
    } },
    {
      $lookup: {
        from: "parties",
        localField: "party",
        foreignField: "_id",
        as: "party",
        pipeline: [
          {
            $project: {
              company_name: 1,
              consignee_name: 1,
              contact_number: 1,
              email_id: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: { path: "$party", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "products",
        localField: "product_id",
        foreignField: "_id",
        as: "product_id",
        pipeline: [
          {
            $project: {
              name: 1,
              price: 1,
              uom: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: { path: "$product_id", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "boms",
        localField: "_id",
        foreignField: "sale_id",
        as: "boms",
      },
    },
    {
      $addFields: {
        has_bom: { $gt: [{ $size: "$boms" }, 0] },
        total_price: {
          $add: [
            { $multiply: ["$price", "$product_qty"] },
            {
              $divide: [
                {
                  $multiply: [
                    { $multiply: ["$price", "$product_qty"] },
                    "$GST",
                  ],
                },
                100,
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        order_id: 1,
        party: 1,
        product_id: 1,
        product_qty: 1,
        price: 1,
        GST: 1,
        total_price: 1,
        uom: 1,
        mode_of_payment: 1,
        terms_of_delivery: 1,
        has_bom: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ])
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();

  const total = await Purchase.countDocuments({ 
    approved: true,
    $or: [
      { salestatus: { $ne: "Production Completed" } },
      { salestatus: { $exists: false } }
    ]
  });

  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

exports.getOne = TryCatch(async (req, res) => {
  const id = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  const data = await Purchase.aggregate([
    { $match: { user_id: id } },
    {
      $lookup: {
        from: "boms",
        localField: "_id",
        foreignField: "sale_id",
        as: "boms",
        pipeline: [
          {
            $lookup: {
              from: "production-processes",
              foreignField: "bom",
              localField: "_id",
              as: "production_processes",
              pipeline: [
                {
                  $project: {
                    processes: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              is_production_started: 1,
              production_processes: 1,
              bom_name: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user_id",
        pipeline: [
          {
            $lookup: {
              from: "user-roles",
              foreignField: "_id",
              localField: "role",
              as: "role",
            },
          },
          {
            $project: {
              first_name: 1,
              role: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "parties",
        localField: "party",
        foreignField: "_id",
        as: "party",
        pipeline: [
          {
            $project: {
              consignee_name: 1,
              contact_number: 1,
              cust_id: 1,
              company_name: 1,
              bill_to: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$party",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "products",
        localField: "product_id",
        foreignField: "_id",
        as: "product_id",
        pipeline: [
          {
            $project: {
              name: 1,
              price: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "assineds",
        localField: "_id",
        foreignField: "sale_id",
        as: "assinedto",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "assined_to",
              foreignField: "_id",
              as: "assinedto",
              pipeline: [
                {
                  $lookup: {
                    from: "user-roles",
                    localField: "role",
                    foreignField: "_id",
                    as: "role",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $addFields: {
        total_price: {
          $add: [
            { $multiply: ["$price", "$product_qty"] },
            {
              $divide: [
                {
                  $multiply: [
                    { $multiply: ["$price", "$product_qty"] },
                    "$GST",
                  ],
                },
                100,
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        sale_status: 1,
        order_id: 1,
        price: 1,
        product_qty: 1,
        GST: 1,
        total_price: 1,
        user_id: 1,
        customer_id: 1,
        product_id: 1,
        party: 1,
        assinedto: 1,
        boms: 1,
        mode_of_payment: 1,
        terms_of_delivery: 1,
        createdAt: 1,
      },
    },
  ])
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
  return res.status(200).json({ message: "data found by id", data });
});

exports.uploadinvoice = TryCatch(async (req, res) => {
  try {
    const { invoice_remark } = req.body;
    const { id } = req.params;
    const { filename } = req.file;
    const find = await Purchase.findById(id);
    if (!find) {
      return res.status(404).json({
        message: "data not found try again",
      });
    }

    const path = `https://rtpasbackend.deepmart.shop/images/${filename}`;

    await Purchase.findByIdAndUpdate(id, {
      invoice: path,
      invoice_remark: invoice_remark,
    });

    // await AssinedModel.findByIdAndUpdate(assined_to, {
    //   isCompleted: "Completed",
    //   assinedto_comment,
    // });

    return res.status(201).json({
      message: "file uploaded successful",
    });
  } catch (err) {
    return res.status(500).json({
      message: err,
    });
  }
});

exports.Delivered = TryCatch(async (req, res) => {
  const { filename } = req.file;
  const { id } = req.params;

  if (!filename) {
    return res.status(404).json({
      message: "file not found",
    });
  }

  const data = await Purchase.findById(id);
  try {
    if (!data) {
      return res.status(404).json({
        message: "data not found",
      });
    }

    const path = `https://rtpasbackend.deepmart.shop/images/${filename}`;
    console.log("req.body.role=", req.body.role);
    if ((req.body.role = "Dispatcher")) {
      await Purchase.findByIdAndUpdate(id, {
        dispatcher_order_ss: path,
        product_status: "Delivered",
      });
    } else {
      await Purchase.findByIdAndUpdate(id, {
        customer_order_ss: path,
        product_status: "Delivered",
      });
    }
    return res.status(200).json({
      message: "file uploaded successful",
    });
  } catch (err) {
    return res.status(500).json({
      message: err,
    });
  }
});
