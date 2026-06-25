package com.syncboard.repository;

import com.syncboard.model.BoardWorkspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface BoardWorkspaceRepository extends JpaRepository<BoardWorkspace, Long> {
    Optional<BoardWorkspace> findByRoomId(String roomId);
}
