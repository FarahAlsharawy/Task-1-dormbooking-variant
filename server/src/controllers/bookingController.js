import Joi from 'joi';
import { Booking } from '../models/Booking.js';

// Validation schema for create (all required fields)
const createSchema = Joi.object({
    roomNumber: Joi.string().required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    purpose: Joi.string().optional(),
    bookedBy: Joi.string().optional()
});

// Validation schema for update (PATCH allows partial updates)
const updateSchema = Joi.object({
    roomNumber: Joi.string(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    purpose: Joi.string(),
    bookedBy: Joi.string()
}).min(1);

// Helper to detect date overlaps for the same room
const checkConflict = async (roomNumber, proposedStart, proposedEnd, excludeBookingId = null) => {
    const query = {
        roomNumber: roomNumber,
        startDate: { $lt: proposedEnd },
        endDate: { $gt: proposedStart }
    };
    
    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }
    
    return await Booking.findOne(query);
};
export async function getAllBookings(req, res, next) {
  try {
    const bookings = await Booking.find().populate('bookedBy', 'name email');
    res.status(200).json(bookings);
  } catch (err) { next(err); }
}

// GET /api/bookings/:id
// TODO: implement per README.md sections 3 and 5.
export async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate('bookedBy', 'name email');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    res.status(200).json(booking);
  } catch (err) { next(err); }
}

// POST /api/bookings
// TODO: implement per README.md sections 3 and 4.
export async function createBooking(req, res, next) {
  try {
    const { error } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { roomNumber, startDate, endDate } = req.body;

    const conflict = await checkConflict(roomNumber, startDate, endDate);
    if (conflict) {
        return res.status(409).json({ error: 'Room is already booked during this time.' });
    }

    const booking = new Booking(req.body);
    await booking.save();
    
    res.status(201).json(booking);
  } catch (err) { next(err); }
}

// PATCH /api/bookings/:id
// TODO: implement per README.md sections 3, 4, and 5.
export async function updateBooking(req, res, next) {
  try {
    const { error } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const existingBooking = await Booking.findById(req.params.id);
    if (!existingBooking) return res.status(404).json({ error: 'Booking not found' });

    const roomNumber = req.body.roomNumber || existingBooking.roomNumber;
    const startDate = req.body.startDate || existingBooking.startDate;
    const endDate = req.body.endDate || existingBooking.endDate;

    // Re-validate date logic if only one date was patched
    if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({ error: 'startDate must be strictly before endDate.' });
    }

    const conflict = await checkConflict(roomNumber, startDate, endDate, req.params.id);
    if (conflict) {
        return res.status(409).json({ error: 'Room is already booked during this updated time.' });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .populate('bookedBy', 'name email');
        
    res.status(200).json(updatedBooking);
  } catch (err) { next(err); }
}

// DELETE /api/bookings/:id
// TODO: implement per README.md sections 3 and 5.
export async function deleteBooking(req, res, next) {
  try {
    const deletedBooking = await Booking.findByIdAndDelete(req.params.id);
    if (!deletedBooking) return res.status(404).json({ error: 'Booking not found' });
    
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (err) { next(err); }
}
