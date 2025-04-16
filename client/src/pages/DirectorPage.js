import { useEffect, useState } from 'react';
import { Button, Checkbox, Container, FormControlLabel, Grid, Link, Slider, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const config = require('../config.json');

export default function DirectorPage() {
    const [data, setData] = useState([]);
    // default value for sortBy shouldn't do anything since sortBy is required
    const [sortBy, setSortBy] = useState('');
    const [limitTop, setLimitTop] = useState(10);
    const [decade, setDecade] = useState(2020);
    const [limitDecade, setLimitDecade] = useState(10);

    // `http://${config.server_host}:${config.server_port}/directors/top`
      // sortBy and limit
    // `http://${config.server_host}:${config.server_port}/directors/:directorId`
      // directorId
    // `http://${config.server_host}:${config.server_port}/directors/by-decade`
      // decade and limit

    const searchTopDirectors = () => {
        fetch(`http://${config.server_host}:${config.server_port}/directors/top?sortBy=${sortBy}&limit=${limitTop}`)
            .then(res => res.json())
            .then(resJson => {
                const directorsWithId = resJson.map((director) => ({ id: director.nconst, ...director }));
                setData(directorsWithId);
        });
    }

    const searchByDecade = () => {
        fetch(`http://${config.server_host}:${config.server_port}/directors/by-decade?decade=${decade}&limit=${limitDecade}`)
            .then(res => res.json())
            .then(resJson => {
                const directorsWithId = resJson.map((director) => ({ id: director.nconst, ...director }));
                setData(directorsWithId);
        });
    }

    return (
      <Container>
        {/*selectedSongId && <SongCard songId={selectedSongId} handleClose={() => setSelectedSongId(null)} />*/}
        <h2>Search Directors</h2>
        <Grid container spacing={6}>
          <Grid item xs={6}>
            <TextField label='Sort By' value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: "100%" }}/>
          </Grid>
          <Grid item xs={3}>
            <p>Limit</p>
            <Slider
              value={limit}
              min={1}
              max={20}
              step={1}
              onChange={(e, newValue) => setLimitTop(newValue)}
              valueLabelDisplay='auto'
              valueLabelFormat={value => <div>{value}</div>}
            />
          </Grid>
          <Grid item xs={6}>
            <p>Decade</p>
            <Slider
              value={danceability}
              min={1930}
              max={2020}
              step={10}
              onChange={(e, newValue) => setDecade(newValue)}
              valueLabelDisplay='auto'
              valueLabelFormat={value => <div>{value}</div>}
            />
          </Grid>
          <Grid item xs={3}>
            <p>Limit</p>
            <Slider
              value={limit}
              min={1}
              max={20}
              step={1}
              onChange={(e, newValue) => setLimitDecade(newValue)}
              valueLabelDisplay='auto'
              valueLabelFormat={value => <div>{value}</div>}
            />
          </Grid>
        </Grid>
        <Button onClick={() => searchTopDirectors() } style={{ left: '50%', transform: 'translateX(-50%)' }}>
          Search by Top
        </Button>
        <Button onClick={() => searchByDecade() } style={{ left: '50%', transform: 'translateX(-50%)' }}>
          Search by Decade
        </Button>
        {/*     
        <Button onClick={() => search() } style={{ left: '50%', transform: 'translateX(-50%)' }}>
          Search
        </Button>
        <h2>Results</h2>
        <DataGrid
          rows={data}
          columns={columns}
          pageSize={pageSize}
          rowsPerPageOptions={[5, 10, 25]}
          onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
          autoHeight
        />
        */}
      </Container>
    );
};