-- Migration: Create RPC Function for Active Insulin Calculation
-- Description: Centralizes IOB calculation using biexponential decay model (Walsh)
-- This eliminates code duplication between Edge Functions and Frontend

CREATE OR REPLACE FUNCTION calculate_active_insulin(
  p_user_id UUID,
  p_dia INTEGER DEFAULT 4
)
RETURNS NUMERIC AS $$
DECLARE
  v_iob NUMERIC := 0;
  v_dose RECORD;
  v_hours_ago NUMERIC;
  v_tau1 NUMERIC;
  v_tau2 NUMERIC;
  v_A NUMERIC;
  v_fast_phase NUMERIC;
  v_slow_phase NUMERIC;
BEGIN
  -- Biexponential parameters based on DIA (Duration of Insulin Action)
  CASE p_dia
    WHEN 3 THEN
      -- Ultra-rapid insulin (Fiasp, Lyumjev)
      v_tau1 := 0.55;
      v_tau2 := 1.2;
      v_A := 0.65;
    WHEN 5 THEN
      -- Regular insulin
      v_tau1 := 0.95;
      v_tau2 := 2.0;
      v_A := 0.65;
    ELSE
      -- Standard rapid-acting (Humalog, NovoRapid) - DIA = 4 (default)
      v_tau1 := 0.75;
      v_tau2 := 1.6;
      v_A := 0.65;
  END CASE;

  -- Iterate over recent doses (last 1.5 × DIA hours)
  -- Only Bolus and Correction doses contribute to IOB
  FOR v_dose IN
    SELECT 
      units::NUMERIC,
      EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS hours_ago
    FROM insulin_history
    WHERE user_id = p_user_id
      AND created_at >= NOW() - (p_dia * 1.5 || ' hours')::INTERVAL
      AND (insulin_type = 'Bolus' OR insulin_type = 'Correção')
    ORDER BY created_at DESC
  LOOP
    v_hours_ago := v_dose.hours_ago;
    
    -- Skip if beyond cutoff (1.5 × DIA)
    IF v_hours_ago > (p_dia * 1.5) THEN
      CONTINUE;
    END IF;

    -- Biexponential IOB calculation (Walsh Model)
    -- Fast phase: rapid absorption and peak action
    v_fast_phase := v_A * EXP(-v_hours_ago / v_tau1);
    
    -- Slow phase: gradual elimination
    v_slow_phase := (1 - v_A) * EXP(-v_hours_ago / v_tau2);
    
    -- Total IOB contribution from this dose
    v_iob := v_iob + (v_dose.units * (v_fast_phase + v_slow_phase));
  END LOOP;

  -- Return IOB rounded to 1 decimal place
  RETURN ROUND(v_iob, 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- Add helpful comment
COMMENT ON FUNCTION calculate_active_insulin IS 
'Calculates Active Insulin On Board (IOB) using Walsh biexponential decay model.
Only considers Bolus and Correction doses from the last 1.5×DIA hours.
Parameters:
  - p_user_id: User UUID
  - p_dia: Duration of Insulin Action in hours (default: 4)
Returns: IOB in units, rounded to 1 decimal place';
