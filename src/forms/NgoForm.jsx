import React, { useState } from 'react';

export default function NgoForm({ onDone, auth }) {
    const [requestedAmount, setRequestedAmount] = useState("");
    const [priority, setPriority] = useState("medium");
    const [purpose, setPurpose] = useState("");

    function submit(e) {
        e.preventDefault();
        if (!requestedAmount || isNaN(Number(requestedAmount))) {
            return alert("Please enter a valid amount");
        }

        const requestData = {
            requested_amount: Number(requestedAmount),
            priority,
            purpose,
            status: "open"
        };

        console.log("Request Data:", requestData);
        // TODO: Send to backend API endpoint
        alert("Thank you! Your money request has been submitted.");
        
        // Reset form
        setRequestedAmount("");
        setPriority("medium");
        setPurpose("");
        onDone();
    }

    return (
        <form onSubmit={submit} className="form-scroll">
            <div className="form-group">
                <label>Requested Amount (₹) *</label>
                <input 
                    type="number"
                    value={requestedAmount} 
                    onChange={e => setRequestedAmount(e.target.value)} 
                    placeholder="e.g., 5000"
                    required 
                />
            </div>
            <div className="form-group">
                <label>Priority *</label>
                <select 
                    value={priority} 
                    onChange={e => setPriority(e.target.value)} 
                    required
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            <div className="form-group">
                <label>Purpose / Additional Details (Optional)</label>
                <textarea 
                    value={purpose} 
                    onChange={e => setPurpose(e.target.value)} 
                    rows={3}
                    placeholder="Describe what the funds will be used for..."
                />
            </div>
            <div className="form-actions">
                <button type="submit" className="button-yellow">Submit Money Request</button>
            </div>
        </form>
    );
}