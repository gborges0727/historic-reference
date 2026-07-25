import cpi_us from '../data/series/cpi_us.json';
import population_us from '../data/series/population_us.json';
import population_world from '../data/series/population_world.json';
import life_expectancy_us from '../data/series/life_expectancy_us.json';
import gas_price_us from '../data/series/gas_price_us.json';
import min_wage_us from '../data/series/min_wage_us.json';
import movie_ticket_us from '../data/series/movie_ticket_us.json';
import techFirsts from '../data/tech_firsts.json';

/**
 * The only module that reads the baked series. Everything downstream takes data as
 * arguments, so the computation stays testable without Vite's JSON handling.
 *
 * These files are updated by hand once a year. Nothing fetches at runtime.
 */
export const series = {
  cpi_us,
  population_us,
  population_world,
  life_expectancy_us,
  gas_price_us,
  min_wage_us,
  movie_ticket_us,
};

export { techFirsts };

/** Build year. The distance figures have to stay true as the site is rebuilt. */
export const NOW = new Date().getFullYear();
