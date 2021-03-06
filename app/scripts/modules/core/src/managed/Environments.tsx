import React, { useState, useMemo } from 'react';
import { pick, isEqual, keyBy } from 'lodash';
import { useCurrentStateAndParams, useRouter } from '@uirouter/react';

import { SETTINGS } from 'core/config/settings';
import { Spinner } from 'core/widgets';
import { useDataSource } from '../presentation/hooks';
import { Application, ApplicationDataSource } from '../application';
import { IManagedApplicationEnvironmentSummary, IManagedResourceSummary } from '../domain';

import { ColumnHeader } from './ColumnHeader';
import { ArtifactsList } from './ArtifactsList';
import { EnvironmentsList } from './EnvironmentsList';
import { ArtifactDetail } from './ArtifactDetail';

import styles from './Environments.module.css';

const CONTENT_WIDTH = 1200;

export interface ISelectedArtifactVersion {
  name: string;
  type: string;
  version: string;
}

interface IEnvironmentsProps {
  app: Application;
}

const defaultGettingStartedUrl = 'https://www.spinnaker.io/guides/user/managed-delivery/getting-started/';

export function Environments({ app }: IEnvironmentsProps) {
  const dataSource: ApplicationDataSource<IManagedApplicationEnvironmentSummary> = app.getDataSource('environments');
  const {
    data: { environments, artifacts, resources, hasManagedResources },
    status,
    loaded,
  } = useDataSource(dataSource);
  const loadFailure = status === 'ERROR';

  const {
    stateService: { go },
  } = useRouter();
  const { params } = useCurrentStateAndParams();
  const [isFiltersOpen] = useState(false);

  const resourcesById = useMemo(() => keyBy(resources, 'id'), [resources]);
  const resourcesByEnvironment = useMemo(
    () =>
      environments.reduce((byEnvironment, { name, resources: resourceIds }) => {
        byEnvironment[name] = resourceIds.map(id => resourcesById[id]);
        return byEnvironment;
      }, {} as { [environment: string]: IManagedResourceSummary[] }),
    [environments, resourcesById],
  );

  const selectedVersion = useMemo<ISelectedArtifactVersion>(
    () => (params.version ? pick(params, ['type', 'name', 'version']) : null),
    [params.type, params.name, params.version],
  );
  const selectedArtifactDetails = useMemo(
    () =>
      selectedVersion &&
      artifacts.find(({ type, name }) => type === selectedVersion.type && name === selectedVersion.name),
    [selectedVersion?.type, selectedVersion?.name, artifacts],
  );
  const selectedVersionDetails = useMemo(
    () => selectedArtifactDetails?.versions.find(({ version }) => version === selectedVersion.version),
    [selectedVersion, selectedArtifactDetails],
  );

  if (loadFailure) {
    return (
      <div style={{ width: '100%' }}>
        <h4 className="text-center">There was an error loading environments.</h4>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ width: '100%' }}>
        <Spinner size="medium" message="Loading environments ..." />
      </div>
    );
  }

  const unmanaged = loaded && !hasManagedResources;
  const gettingStartedLink = SETTINGS.managedDelivery?.gettingStartedUrl || defaultGettingStartedUrl;
  if (unmanaged) {
    return (
      <div style={{ width: '100%' }}>
        Welcome! This application does not have any environments or artifacts. Check out the{' '}
        <a href={gettingStartedLink} target="_blank">
          getting started guide
        </a>{' '}
        to set some up!
      </div>
    );
  }

  const totalContentWidth = isFiltersOpen ? CONTENT_WIDTH + 248 + 'px' : CONTENT_WIDTH + 'px';

  return (
    <div style={{ width: '100%' }}>
      <span>For there shall be no greater pursuit than that towards desired state.</span>
      <div style={{ maxWidth: totalContentWidth, display: 'flex' }}>
        {/* No filters for now but this is where they will go */}
        <div className={styles.mainContent} style={{ flex: `0 1 ${totalContentWidth}` }}>
          <div className={styles.artifactsColumn}>
            <ColumnHeader text="Artifacts" icon="artifact" />
            <ArtifactsList
              artifacts={artifacts}
              selectedVersion={selectedVersion}
              versionSelected={clickedVersion => {
                if (!isEqual(clickedVersion, selectedVersion)) {
                  go(selectedVersion ? '.' : '.artifactVersion', clickedVersion);
                }
              }}
            />
          </div>
          <div className={styles.environmentsColumn}>
            {!selectedVersion && (
              <>
                <ColumnHeader text="Environments" icon="environment" />
                <EnvironmentsList {...{ environments, artifacts, resourcesById }} />
              </>
            )}
            {selectedVersion && (
              <ArtifactDetail
                application={app}
                name={selectedVersion.name}
                type={selectedVersion.type}
                version={selectedVersionDetails}
                allVersions={selectedArtifactDetails.versions}
                resourcesByEnvironment={resourcesByEnvironment}
                onRequestClose={() => go('^')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
